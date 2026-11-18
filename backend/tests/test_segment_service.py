from app.services.segment_service import parse_hsk_levels, segment_run

RANKS = {"我们": 50, "明天": 469, "银行": 769, "天去": 900_000, "我": 5, "们": 60, "明": 300,
         "天": 100, "去": 40, "银": 2000, "行": 80, "研究": 600, "研究生": 3000, "生命": 900, "命": 1500,
         "起源": 4000, "生": 70, "的": 1}


def test_splits_into_the_fewest_words():
    assert segment_run("我们明天去银行", RANKS) == ["我们", "明天", "去", "银行"]


def test_ties_go_to_the_more_common_words():
    # 研究生|命 and 研究|生命 are both two words; 研究 + 生命 are more common
    assert segment_run("研究生命", RANKS) == ["研究", "生命"]


def test_unknown_characters_stand_alone():
    assert segment_run("龘的", RANKS) == ["龘", "的"]


def test_never_builds_a_word_longer_than_the_limit():
    ranks = {"一二三四五六七八九": 1}  # 9 chars: longer than MAX_WORD_LENGTH
    assert segment_run("一二三四五六七八九", ranks) == list("一二三四五六七八九")


def test_hsk_levels_per_standard():
    assert parse_hsk_levels(["newest-3", "new-4", "old-3"]) == {"newest": 3, "new": 4, "old": 3}
    assert parse_hsk_levels(["new-7"]) == {"new": 7}
    assert parse_hsk_levels([]) == {}
