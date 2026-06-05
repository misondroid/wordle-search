#!/usr/bin/env python3
# 公式アーカイブから過去の回答を取得するスクリプト

import json
from datetime import date, timedelta, datetime
from urllib.request import urlopen, Request
from time import sleep
from logging import FileHandler, Formatter, INFO, getLogger
from argparse import ArgumentParser

# loggerの設定
logger = getLogger("get_past_answers")
handler = FileHandler("answer.log")
handler.setFormatter(Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
logger.addHandler(handler)
logger.setLevel(INFO)


def parse_args():
    parser = ArgumentParser()
    parser.add_argument("-s", "--start-date",
                        type=str, default=date.today().isoformat())
    parser.add_argument("-e", "--end-date",
                        type=str, default="2025-12-1")
    parser.add_argument("-o", "--output-file",
                        type=str, default="past_answers.json")

    return parser.parse_args()
def get_url(year: int, month: int,day: int) -> str:
    return f"https://www.nytimes.com/svc/wordle/v2/{year}-{month:02d}-{day:02d}.json"

def main():
    args = parse_args()
    # current_date = datetime.now().date()
    # 日付指定の場合
    current_date = date.fromisoformat(args.start_date)
    end_date = date.fromisoformat(args.end_date)
    output_file = args.output_file
    past_answers = []
    errors = []
    while current_date >= end_date:
        url = get_url(current_date.year, current_date.month, current_date.day)
    current_date = date(2026, 5, 30)

    end_date = date(2025, 12, 1)
    starts_at = f"{current_date.year}-{current_date.month:02d}-{current_date.day:02d}"
    ends_at = f"{end_date.year}-{end_date.month:02d}-{end_date.day:02d}"
    output_file = f"past_answers_from_api_{starts_at}_to_{ends_at}.json"
    past_answers = []
    errors = []
    while current_date >= end_date:
        url = get_url(current_date.year, current_date.month, current_date.day)
        logger.info(f"trying -> {url}")
        try:
            response = urlopen(Request(url)).read()
            data = json.loads(response)
            logger.info(f"got -> {data}")
            sleep(0.1)
            past_answers.append(data)
        except Exception as e:
            logger.error(f"error -> {e}")
            errors.extend({
                "date": f"{current_date.year}-{current_date.month:02d}-{current_date.day:02d}", 
                "error": e})
        current_date -= timedelta(days=1)
    if len(errors) > 0:
        with open("errors.json","w") as f:
            json.dump(errors,f) 
    with open(output_file, 'w') as f:
        json.dump(past_answers,f)
if __name__ == "__main__":
    main()