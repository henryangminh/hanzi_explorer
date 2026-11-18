from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import table
from sqlmodel import Session, func, select

from app.core.config import get_settings
from app.models import DICTIONARY_SCHEMA
from app.models.cache import ExternalCache
from app.models.character import Character, DictionarySource
from app.schemas.data_source import DataSources, Dataset, DefinitionSource, OnlineSource
from app.services import hvdic_crawl_service

# Where each source comes from (see migration/README.md). A source missing here is shown without an origin.
DEFINITION_ORIGINS = {
    "CC-CEDICT": "mdbg.net/chinese/dictionary?page=cc-cedict",
    "CVDICT": "github.com/ph0ngp/CVDICT",
    "现代汉语词典": "现代汉语词典 第7版 (MDict)",
}

# Dictionary tables besides definitions: (key, table, origin)
DATASETS = (
    ("sinoVietnamese", "sino_vietnamese", "github.com/ph0ngp/hanviet-pinyin-wordlist"),
    ("synonyms", "synonym_groups", "github.com/guotong1988/chinese_dictionary"),
    ("antonyms", "antonyms", "github.com/guotong1988/chinese_dictionary"),
    ("radicals", "radical_groups", "radical.csv"),
    ("decomposition", "hanzi_decomposition", "hanzipy"),
    ("hsk", "hsk_words", "github.com/drkameleon/complete-hsk-vocabulary"),
)


def _row_count(session: Session, name: str) -> int:
    return session.exec(select(func.count()).select_from(table(name, schema=DICTIONARY_SCHEMA))).one()


def _definition_sources(session: Session) -> list[DefinitionSource]:
    return [
        DefinitionSource(name=s.name, version=s.version, entry_count=s.entry_count,
                         imported_at=s.imported_at, origin=DEFINITION_ORIGINS.get(s.name))
        for s in session.exec(select(DictionarySource).order_by(DictionarySource.id)).all()
    ]


def _online_sources(session: Session) -> list[OnlineSource]:
    rows = session.exec(
        select(ExternalCache.source, func.count(ExternalCache.id), func.max(ExternalCache.cached_at))
        .group_by(ExternalCache.source)
        .order_by(ExternalCache.source)
    ).all()
    return [OnlineSource(source=source, cached_words=count, last_cached_at=last) for source, count, last in rows]


def get_data_sources(session: Session) -> DataSources:
    settings = get_settings()
    built_at = Path(settings.dictionary_db_path).stat().st_mtime
    return DataSources(
        dictionary_built_at=datetime.fromtimestamp(built_at, timezone.utc),
        total_words=session.exec(select(func.count(Character.id))).one(),
        definition_sources=_definition_sources(session),
        datasets=[Dataset(key=key, rows=_row_count(session, name), origin=origin) for key, name, origin in DATASETS],
        online_sources=_online_sources(session),
        crawler=hvdic_crawl_service.get_status(session, Path(settings.hvdic_db_path)),
    )
