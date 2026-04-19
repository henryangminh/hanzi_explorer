from sqlmodel import Session, select

from app.models.character import Character, PinyinReading
from app.models.sino_vn import SinoVietnamese
from app.models.synonym_antonym import Antonym, SynonymMember
from app.schemas.dictionary import WordInfo


def _get_word_info(session: Session, word: str) -> WordInfo:
    pinyin = ''
    hanviet = ''

    # Pinyin: first reading of the word's character
    char_row = session.exec(select(Character).where(Character.simplified == word)).first()
    if char_row:
        pr = session.exec(
            select(PinyinReading)
            .where(PinyinReading.character_id == char_row.id)
            .order_by(PinyinReading.id)
        ).first()
        pinyin = pr.pinyin if pr else ''

    # Hán Việt: compose reading char by char (first sv reading per char)
    parts: list[str] = []
    for ch in list(word):
        ch_row = session.exec(select(Character).where(Character.simplified == ch)).first()
        if ch_row:
            sv = session.exec(
                select(SinoVietnamese)
                .where(SinoVietnamese.character_id == ch_row.id)
                .order_by(SinoVietnamese.id)
            ).first()
            parts.append(sv.hanviet if sv else '')
        else:
            parts.append('')

    if all(parts):
        hanviet = ' '.join(p.split(',')[0].strip() for p in parts)

    return WordInfo(word=word, pinyin=pinyin, hanviet=hanviet)


def lookup_synonyms(session: Session, char: str, limit: int = 30) -> list[WordInfo]:
    # Find all synonym group IDs this word belongs to
    group_ids = session.exec(
        select(SynonymMember.group_id).where(SynonymMember.word == char)
    ).all()

    if not group_ids:
        return []

    # Find all other words in those groups
    words = session.exec(
        select(SynonymMember.word)
        .where(SynonymMember.group_id.in_(group_ids))
        .where(SynonymMember.word != char)
        .distinct()
        .limit(limit)
    ).all()

    return [_get_word_info(session, w) for w in words]


def lookup_antonyms(session: Session, char: str) -> list[WordInfo]:
    # Antonym pairs are stored bidirectionally — search both columns
    as_word1 = session.exec(select(Antonym.word2).where(Antonym.word1 == char)).all()
    as_word2 = session.exec(select(Antonym.word1).where(Antonym.word2 == char)).all()

    words = list({*as_word1, *as_word2})
    return [_get_word_info(session, w) for w in words]
