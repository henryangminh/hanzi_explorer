from typing import Optional
from sqlmodel import Field, SQLModel

from app.models import DICTIONARY_SCHEMA


class SynonymGroup(SQLModel, table=True):
    """
    A thesaurus group from dict_synonym.txt.
    Each group_code (e.g. 'Aa01A01') contains a set of synonymous words.
    """
    __tablename__ = "synonym_groups"
    __table_args__ = {"schema": DICTIONARY_SCHEMA}

    id: Optional[int] = Field(default=None, primary_key=True)
    group_code: str = Field(max_length=20)


class SynonymMember(SQLModel, table=True):
    """
    A word belonging to a synonym group.
    To find synonyms of word X: find all group_ids where word=X,
    then return all other words in those groups.
    """
    __tablename__ = "synonym_members"
    __table_args__ = {"schema": DICTIONARY_SCHEMA}

    id: Optional[int] = Field(default=None, primary_key=True)
    group_id: int = Field(foreign_key=f"{DICTIONARY_SCHEMA}.synonym_groups.id")
    word: str = Field(max_length=50)


class Antonym(SQLModel, table=True):
    """
    An antonym pair from dict_antonym.txt.
    Lookup: find rows where word1=X or word2=X, return the partner.
    """
    __tablename__ = "antonyms"
    __table_args__ = {"schema": DICTIONARY_SCHEMA}

    id: Optional[int] = Field(default=None, primary_key=True)
    word1: str = Field(max_length=20)
    word2: str = Field(max_length=20)
