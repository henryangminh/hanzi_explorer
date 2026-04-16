from typing import Optional
from sqlalchemy import Index
from sqlmodel import Field, SQLModel


class SynonymGroup(SQLModel, table=True):
    """
    A thesaurus group from dict_synonym.txt.
    Each group_code (e.g. 'Aa01A01') contains a set of synonymous words.
    """
    __tablename__ = "synonym_groups"

    id: Optional[int] = Field(default=None, primary_key=True)
    group_code: str = Field(max_length=20, unique=True, index=True)


class SynonymMember(SQLModel, table=True):
    """
    A word belonging to a synonym group.
    To find synonyms of word X: find all group_ids where word=X,
    then return all other words in those groups.
    """
    __tablename__ = "synonym_members"
    __table_args__ = (
        Index("ix_synonym_members_word", "word"),
        Index("ix_synonym_members_group_id", "group_id"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    group_id: int = Field(foreign_key="synonym_groups.id")
    word: str = Field(max_length=50)


class Antonym(SQLModel, table=True):
    """
    An antonym pair from dict_antonym.txt.
    Lookup: find rows where word1=X or word2=X, return the partner.
    """
    __tablename__ = "antonyms"
    __table_args__ = (
        Index("ix_antonyms_word1", "word1"),
        Index("ix_antonyms_word2", "word2"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    word1: str = Field(max_length=20)
    word2: str = Field(max_length=20)
