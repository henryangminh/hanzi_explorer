import io
import re
import numpy as np
from fastapi import APIRouter, File, HTTPException, UploadFile
from PIL import Image, ImageFilter

router = APIRouter(prefix="/recognize", tags=["recognize"])

# CJK Unified Ideographs — main block + Extension A
_CHINESE_RE = re.compile(r'[\u4e00-\u9fff\u3400-\u4dbf]')

_ocr = None


def _get_ocr():
    global _ocr
    if _ocr is None:
        from paddleocr import PaddleOCR  # type: ignore

        _ocr = PaddleOCR(
            lang="ch",
            use_doc_orientation_classify=False,
            use_doc_unwarping=False,
            use_textline_orientation=False,
            text_det_thresh=0.15,
            text_det_box_thresh=0.25,
            text_det_unclip_ratio=2.5,
            text_rec_score_thresh=0.0,
        )
    return _ocr


def _dilate(image: Image.Image, size: int) -> Image.Image:
    """
    Expand dark strokes outward so thin handwriting becomes detectable.
    PIL MinFilter spreads low-value (dark) pixels across `size`×`size` neighbourhood.
    """
    gray = image.convert("L")
    thick = gray.filter(ImageFilter.MinFilter(size))
    return thick.convert("RGB")


def _extract_chinese(text: str) -> list[str]:
    return _CHINESE_RE.findall(text)


def _run_ocr(img_array: np.ndarray, seen: set[str], candidates: list[str]) -> None:
    """Run one OCR pass and append new Chinese characters into candidates."""
    try:
        result = list(_get_ocr().predict(img_array))
        if not result or not result[0]:
            return
        r0 = result[0]
        pairs = sorted(
            zip(r0.get("rec_texts", []), r0.get("rec_scores", [])),
            key=lambda x: -x[1],
        )
        for text, _ in pairs:
            for char in _extract_chinese(text):
                if char not in seen:
                    seen.add(char)
                    candidates.append(char)
    except Exception:
        pass


@router.post("")
async def recognize_hanzi(file: UploadFile = File(...)):
    """
    Receive a PNG of handwritten Chinese characters (white bg, black strokes).
    Returns up to 5 candidate Chinese characters via multi-pass OCR with
    progressively stronger stroke dilation to handle thin handwriting.
    """
    contents = await file.read()

    try:
        image = Image.open(io.BytesIO(contents)).convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image file")

    # Ensure minimum 256 px on both sides for reliable text detection
    w, h = image.size
    if w < 256 or h < 256:
        scale = 256 / min(w, h)
        image = image.resize((int(w * scale), int(h * scale)), Image.LANCZOS)

    seen: set[str] = set()
    candidates: list[str] = []

    # Pass 1 – moderate dilation (handles strokes ~2–4 px after canvas scaling)
    _run_ocr(np.array(_dilate(image, size=7)), seen, candidates)

    # Pass 2 – stronger dilation (handles very thin strokes on high-DPR devices)
    if len(candidates) < 3:
        _run_ocr(np.array(_dilate(image, size=13)), seen, candidates)

    # Pass 3 – original image (fallback; sometimes dilation hurts complex characters)
    if len(candidates) < 3:
        _run_ocr(np.array(image), seen, candidates)

    if not candidates:
        raise HTTPException(status_code=422, detail="No Chinese character recognized")

    return {"candidates": candidates[:5]}
