"""
Seed radical_groups and radical_compounds.
Run AFTER import_cedict.py.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlmodel import Session, select
from app.core.database import engine, init_db
from app.models.note import RadicalGroup, RadicalCompound

RADICALS = [
    { 'radical':'水','pinyin':'shuǐ','meaning_en':'water','meaning_vi':'nước','stroke_count':4,
      'compounds':['河','海','湖','洗','泳','泪','清','流','泡','浪'] },
    { 'radical':'火','pinyin':'huǒ','meaning_en':'fire','meaning_vi':'lửa','stroke_count':4,
      'compounds':['烧','热','炒','灯','烟','炸','煮','炮'] },
    { 'radical':'人','pinyin':'rén','meaning_en':'person','meaning_vi':'người','stroke_count':2,
      'compounds':['他','休','信','做','仁','伙','但','们','位'] },
    { 'radical':'木','pinyin':'mù','meaning_en':'tree, wood','meaning_vi':'cây, gỗ','stroke_count':4,
      'compounds':['树','桌','椅','森','板','根','棵'] },
    { 'radical':'心','pinyin':'xīn','meaning_en':'heart, mind','meaning_vi':'tim, tâm','stroke_count':4,
      'compounds':['想','忘','感','忙','悲','恋','怕','快'] },
]


def run():
    init_db()
    with Session(engine) as session:
        for r_data in RADICALS:
            group = session.exec(
                select(RadicalGroup).where(RadicalGroup.radical == r_data['radical'])
            ).first()
            if not group:
                group = RadicalGroup(
                    radical=r_data['radical'], pinyin=r_data['pinyin'],
                    meaning_en=r_data['meaning_en'], meaning_vi=r_data['meaning_vi'],
                    stroke_count=r_data['stroke_count'],
                )
                session.add(group)
                session.commit()
                session.refresh(group)
                print(f'  Created radical: {r_data["radical"]}')

            for char_str in r_data['compounds']:
                exists = session.exec(
                    select(RadicalCompound)
                    .where(RadicalCompound.radical_id == group.id)
                    .where(RadicalCompound.char_simplified == char_str)
                ).first()
                if not exists:
                    session.add(RadicalCompound(
                        radical_id=group.id,
                        char_simplified=char_str,
                    ))
        session.commit()
        print('Seeding complete.')


if __name__ == '__main__':
    run()
