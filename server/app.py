from flask import Flask, jsonify, request
from flask_cors import CORS
import json
import os

app = Flask(__name__)

# Настройка CORS
CORS(app, 
     origins=["*"],
     methods=["GET", "POST", "OPTIONS"],
     allow_headers=["Content-Type", "Authorization"],
     supports_credentials=True
)

@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response

DATA_DIR = os.path.dirname(os.path.abspath(__file__))

def load_data(filename):
    path = os.path.join(DATA_DIR, filename)
    if not os.path.exists(path):
        with open(path, 'w', encoding='utf-8') as f:
            json.dump([], f)
        return []
    with open(path, 'r', encoding='utf-8') as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return []

def save_data(filename, data):
    path = os.path.join(DATA_DIR, filename)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

# ============================================
# НОВЫЙ: Эндпоинт проверки статуса сервера
# ============================================
@app.route('/status', methods=['GET', 'OPTIONS'])
def get_status():
    """Возвращает статус сервера и количество записей в каждой группе"""
    print("[STATUS] Запрос статуса сервера")
    
    groups = {
        '2g': 'data_2g.json',
        '3g': 'data_3g.json'
    }
    
    groups_info = {}
    total_records = 0
    
    for group_key, filename in groups.items():
        data = load_data(filename)
        count = len(data)
        groups_info[group_key] = count
        total_records += count
    
    return jsonify({
        'status': 'ok',
        'server': 'EBS API Server',
        'version': '1.0',
        'groups': groups_info,
        'total_records': total_records,
        'message': 'Сервер работает нормально'
    })

@app.route('/get_data/<group>', methods=['GET', 'OPTIONS'])
def get_data(group):
    print(f"[GET] Запрос данных для группы: {group}")
    filename = f"data_{group}.json"
    data = load_data(filename)
    print(f"[GET] Отправлено {len(data)} записей")
    return jsonify(data)

@app.route('/add_data', methods=['POST', 'OPTIONS'])
def add_data():
    print(f"[POST] Запрос на добавление данных")
    
    if request.method == 'OPTIONS':
        return '', 200
    
    req = request.json
    group = req.get('group')
    term = req.get('term')
    description = req.get('description')
    
    if not group or not term or not description:
        return jsonify({"error": "Missing fields"}), 400
        
    filename = f"data_{group}.json"
    data = load_data(filename)
    
    new_entry = {"term": term, "description": description}
    data.append(new_entry)
    
    save_data(filename, data)
    print(f"[POST] Добавлена запись: {term}")
    return jsonify({"status": "success", "message": "Запись добавлена"})

if __name__ == '__main__':
    print("=" * 60)
    print("🚀 EBS Server starting...")
    print("📡 URL: http://localhost:49850")
    print("🔍 Status endpoint: http://localhost:49850/status")
    print("📁 Data directory:", DATA_DIR)
    print("=" * 60)
    app.run(host='0.0.0.0', port=49850, debug=True, ssl_context=('msk_cert.pem', 'msk_pk.pem'))
