import requests
import json
import time
import random

# URL
url = 'https://tests24.ru/3q.php'

# Заголовки (копируем из curl)
headers = {
    'accept': 'text/html, */*; q=0.01',
    'accept-language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
    'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
    'origin': 'https://tests24.ru',
    'priority': 'u=1, i',
    'referer': 'https://tests24.ru/one_quest.php',
    'sec-ch-ua': '"Not:A-Brand";v="99", "Google Chrome";v="145", "Chromium";v="145"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"macOS"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
    'x-requested-with': 'XMLHttpRequest'
}

# Cookies (строка из curl)
cookies_strf = (
    'tester=%D0%98%D0%BD%D0%BA%D0%BE%D0%B3%D0%BD%D0%B8%D1%82%D0%BE; '
    '_gid=GA1.2.1741780594.1773251067; '
    '_ym_uid=177325106789982331; '
    '_ym_d=1773251067; '
    '_ym_isad=1; '
    '_ga=GA1.1.2041800358.1773251067; '
    '_ga_57BR13LWG0=GS2.1.s1773251066$o1$g1$t1773251069$j57$l0$h0'
)

big_data = []
# Разбираем cookies (декодируем URL-кодированные значения)
cookies = {}
for item in cookies_strf.split('; '):
    key, value = item.split('=', 1)
    cookies[key] = value 

def pretty_parsing(test_id: str, num: str, data: dict):
    question = data['name'].strip()
    print(f'{num}) {question}')
    for answer in data['ansv']:
        # Определяем символ: галочка для правильного, крестик для неправильного
        mark = '[✓]' if answer['val'] == '1' else '[×]'
        # Выводим вариант с символом
        print(f"{mark} {answer['name']}")
    print("\n")
    print("\n")



def main(test_id, cycles):
    for i in range(1,cycles):
        
        data = {
            'id': str(test_id),
            'num': str(i)
        }
        response = requests.post(url, headers=headers, cookies=cookies, data=data)
        pretty_parsing(str(test_id), str(i), response.json())
        big_data.append(response.json())
        time.sleep(0.5)


    with open(f"{test_id}_question.json", 'w') as file:
        file.write(str(big_data))

if __name__ == "__main__":
    main(test_id = '747', cycles = 30)

