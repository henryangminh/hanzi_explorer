import sqlite3
import csv
from hanzipy.decomposer import HanziDecomposer

# --- CẤU HÌNH ---
DB_PATH = '/Users/henryangminh/Projects/hanzi_explorer/backend/data/hanzi.db' 
OUTPUT_CSV = 'hanzi_decomposition.csv'

def process_decomposition():
    decomposer = HanziDecomposer()
    
    # Set để theo dõi các chữ cái gốc đã xử lý (tránh trùng lặp trong toàn bộ file)
    processed_main_chars = set()
    
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Truy vấn dữ liệu từ SQLite
        query = """
            SELECT simplified, traditional 
            FROM cc_cedict_characters 
            WHERE length(simplified) = 1
        """
        cursor.execute(query)
        rows = cursor.fetchall()
        
        final_data = []
        
        for sim, trad in rows:
            # Gom các chữ cần xử lý từ hàng hiện tại (sim và trad nếu có)
            candidates = []
            if sim: candidates.append(sim)
            if trad and trad != sim: candidates.append(trad)
            
            for char in candidates:
                # KIỂM TRA: Mỗi chữ gốc chỉ xử lý 1 lần duy nhất trong toàn bộ file
                if char not in processed_main_chars:
                    processed_main_chars.add(char)
                    
                    # Gọi hanzipy để phân tích
                    decomp = decomposer.decompose(char)
                    
                    # Danh sách chứa các thành phần (đảm bảo thứ tự và không trùng cho mỗi chữ)
                    components_for_this_char = [char]
                    
                    # Gộp once và radical
                    raw_list = decomp.get('once', []) + decomp.get('radical', [])
                    
                    for comp in raw_list:
                        # Chỉ loại bỏ "No glyph available" và kiểm tra trùng lặp trong chính chữ đó
                        if comp != "No glyph available" and comp not in components_for_this_char:
                            components_for_this_char.append(comp)
                    
                    # Chuyển vào danh sách kết quả cuối cùng
                    for item in components_for_this_char:
                        final_data.append([char, item])
                        
        # Ghi file CSV
        with open(OUTPUT_CSV, 'w', newline='', encoding='utf-8-sig') as f:
            writer = csv.writer(f)
            writer.writerow(['character', 'component'])
            writer.writerows(final_data)
            
        print(f"Hoàn thành! Đã xử lý {len(processed_main_chars)} chữ cái duy nhất.")
        print(f"Tổng số dòng ghi vào CSV: {len(final_data)}")

    except sqlite3.Error as e:
        print(f"Lỗi Database: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    process_decomposition()