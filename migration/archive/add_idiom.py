import csv
import sqlite3
from datetime import datetime, timezone
from collections import Counter

# Cấu hình thông số
DB_NAME = '/Users/henryangminh/Projects/hanzi_explorer/backend/data/hanzi.db'  # Thay bằng tên file database của bạn
CSV_FILE = 'idiom.csv'         # Thay bằng tên file csv của bạn
START_ID = 26018
NOTEBOOK_ID = 21

def import_csv_to_sqlite():
    try:
        conn = sqlite3.connect(DB_NAME)
        cursor = conn.cursor()

        with open(CSV_FILE, mode='r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            
            data_to_insert = []
            current_id = START_ID
            seen_chars = set()  # Dùng set để check unique trong file CSV
            duplicate_count = 0

            for row in reader:
                char_val = row['simplified'].strip()
                
                # CHỈ xử lý nếu chữ này chưa xuất hiện trong các dòng trước của file CSV
                if char_val not in seen_chars:
                    added_at = datetime.now(timezone.utc).isoformat()
                    data_to_insert.append((current_id, NOTEBOOK_ID, char_val, added_at))
                    
                    seen_chars.add(char_val)
                    current_id += 1
                else:
                    duplicate_count += 1

            if duplicate_count > 0:
                print(f"⚠️ Đã phát hiện và loại bỏ {duplicate_count} dòng trùng lặp nội bộ trong file CSV.")

            if data_to_insert:
                # Sử dụng INSERT OR IGNORE để phòng trường hợp chữ đã tồn tại sẵn trong DB từ trước
                cursor.executemany('''
                    INSERT OR IGNORE INTO notebook_entries (id, notebook_id, char, added_at)
                    VALUES (?, ?, ?, ?)
                ''', data_to_insert)
                
                conn.commit()
                print(f"✅ Thành công! Đã chèn {cursor.rowcount} dòng mới vào database.")
            else:
                print("ℹ️ Không có dữ liệu mới hợp lệ để chèn.")

    except Exception as e:
        print(f"❌ Lỗi: {e}")
    finally:
        if conn:
            conn.close()

def check_csv_duplicates(file_path):
    print(f"--- Đang kiểm tra trùng lặp trong file: {file_path} ---")
    
    chars = []
    try:
        with open(file_path, mode='r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                # Lấy giá trị, dùng strip() để loại bỏ khoảng trắng thừa
                char = row['simplified'].strip()
                if char:
                    chars.append(char)
        
        # Đếm số lần xuất hiện của mỗi từ
        counts = Counter(chars)
        # Chỉ lọc ra những từ xuất hiện > 1 lần
        duplicates = {word: count for word, count in counts.items() if count > 1}
        
        if not duplicates:
            print("✅ Tuyệt vời: Không có từ nào bị trùng lặp trong file CSV.")
            return True
        else:
            print(f"⚠️ Phát hiện {len(duplicates)} từ bị trùng lặp:")
            for word, count in duplicates.items():
                print(f"   - Từ '{word}': xuất hiện {count} lần")
            return False
            
    except Exception as e:
        print(f"❌ Lỗi khi đọc file: {e}")
        return False

if __name__ == "__main__":
    check_csv_duplicates(CSV_FILE)
    import_csv_to_sqlite()