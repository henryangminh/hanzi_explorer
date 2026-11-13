# -*- coding: utf-8 -*-
"""
Migration: add is_separable column to characters table and mark separable verbs.
Run: cd backend && python scripts/add_is_separable.py
"""
import sqlite3
import json
from pathlib import Path

DB = Path(__file__).parent.parent / 'data' / 'hanzi.db'

SEPARABLE = [
    # 一级 (4)
    '看见', '上班', '睡觉', '说话',
    # 二级 (7)
    '唱歌', '考试', '跑步', '起床', '生病', '跳舞', '游泳',
    # 三级 (17)
    '帮忙', '担心', '放心', '见面', '结婚', '离开', '认真', '生气', '刷牙',
    '提高', '同事', '完成', '洗澡', '有名', '着急', '注意', '请假',
    # 四级 (26)
    '报道', '报名', '毕业', '吃惊', '出差', '打针', '道歉', '得意', '鼓掌',
    '过去', '害羞', '加班', '结果', '理发', '聊天', '留学', '起来', '请假',
    '请客', '散步', '伤心', '提醒', '握手', '堵车', '干杯', '迷路',
    # 五级 (39)
    '操心', '吵架', '吃亏', '出口', '辞职', '打工', '点头', '发愁', '发言',
    '罚款', '付款', '干杯', '干活儿', '革命', '潜水', '合影', '灰心', '挂号',
    '过期', '及格', '劳驾', '离婚', '录音', '落后', '冒险', '迷路', '排队',
    '碰见', '破产', '签字', '上当', '失业', '使劲', '受伤', '说服', '投资',
    '移动', '应聘', '作文',
    # 六级 (65)
    '把关', '罢工', '拜年', '保密', '报仇', '表态', '裁员', '成交', '抽空',
    '吹牛', '打架', '打猎', '打仗', '当面', '动身', '动手', '发财', '发呆',
    '发火', '发誓', '发言', '放手', '分红', '分手', '过瘾', '化妆', '怀孕',
    '加工', '兼职', '剪彩', '将军', '解雇', '经商', '敬礼', '就业', '鞠躬',
    '绝望', '旷课', '领先', '留神', '落后', '拼命', '破例', '起草', '潜水',
    '让步', '撒谎', '刹车', '受罪', '算数', '投票', '消毒', '泄气', '宣誓',
    '延期', '要命', '迎面', '用功', '遭殃', '造反', '沾光', '值班', '走私',
    '作弊', '做主',
]

# Deduplicate while preserving order
_seen = set()
SEPARABLE_UNIQUE = []
for w in SEPARABLE:
    if w not in _seen:
        _seen.add(w)
        SEPARABLE_UNIQUE.append(w)


def main():
    conn = sqlite3.connect(str(DB))
    cur = conn.cursor()

    # Ensure column exists
    cols = [row[1] for row in cur.execute('PRAGMA table_info(characters)').fetchall()]
    if 'is_separable' not in cols:
        cur.execute('ALTER TABLE characters ADD COLUMN is_separable BOOLEAN DEFAULT 0')
        print('[+] Added is_separable column')
    else:
        print('[i] Column is_separable already exists')

    # Reset all, then mark our list
    cur.execute('UPDATE characters SET is_separable = 0')
    ph = ','.join('?' * len(SEPARABLE_UNIQUE))
    result = cur.execute(
        f'UPDATE characters SET is_separable = 1 WHERE simplified IN ({ph})',
        SEPARABLE_UNIQUE,
    )
    updated = result.rowcount

    # Find missing (use JSON to avoid console encoding issues on Windows)
    found = {row[0] for row in cur.execute(
        f'SELECT simplified FROM characters WHERE simplified IN ({ph}) AND is_separable = 1',
        SEPARABLE_UNIQUE,
    ).fetchall()}
    missing = [w for w in SEPARABLE_UNIQUE if w not in found]

    conn.commit()
    conn.close()

    print(f'[+] Set is_separable=1 for {updated} rows')
    print(f'[i] List total: {len(SEPARABLE_UNIQUE)} unique words (raw: {len(SEPARABLE)})')
    if missing:
        print(f'[!] Not found in DB ({len(missing)}): {json.dumps(missing, ensure_ascii=False)}')
    else:
        print('[+] All words found in DB.')
    print('[done]')


if __name__ == '__main__':
    main()
