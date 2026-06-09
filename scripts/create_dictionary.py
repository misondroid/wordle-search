#!/usr/bin/env python3
import json
from urllib.request import urlopen, Request
from time import sleep
from pathlib import Path
from logging import FileHandler, Formatter, INFO, getLogger
from argparse import ArgumentParser, ArgumentDefaultsHelpFormatter
from datetime import date, timedelta
from pprint import pprint
#
dictionary_url = "https://raw.githubusercontent.com/dwyl/english-words/master/words_dictionary.json"

class Answer:
    def __init__(self, solution: str, print_date: str):
        self.solution = solution
        self.print_date = print_date



# loggerの設定
def prepare_logger(args):
    logger = getLogger("create_dictionary")
    handler = FileHandler(args.log_file)
    handler.setFormatter(Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
    logger.addHandler(handler)
    logger.setLevel(INFO)
    return logger

def get_defaults(selector: str = "values"):
    data ={
        "values": {
            "dictionry": "words_doctionry.json",
            "log_file": "create_dictionary.log",
            "answers_file": "files/answers.json",
            "output_file": "words.json.gz",
            "start_date": (date.today() - timedelta(days=1)).isoformat(),
            "end_date": "2026-05-30"
        },
        "help": {
            "dictionry": "デフォルトの辞書ファイル名",
            "log_file": "ログファイル名",
            "answers_file": "回答ファイル名",
            "output_file": "出力ファイル名",
            "start_date": "開始日(YYYY-MM-DD) ※当日だとネタバレや取得失敗の可能性があるので、前日以前を指定してください",
            "end_date": "終了日(YYYY-MM-DD) ※2021-06-19以前のデータは取得できません"
        },
        "examples": {
            "dictionry": "words_dictionary.json",
            "log_file": "create_dictionary.log",
            "answers_file": "answers.json",
            "output_file": "words.json.gz",
            "start_date": "2026-05-30",
            "end_date": "2026-05-30"
        },
        "description": {
            "app": "Wordle用正規表現辞書検索アプリのための単語リストファイルを過去問を収集して作成するスクリプトです。",

    }}
    return data[selector]

def parse_args():
    parser = ArgumentParser(description=get_defaults("description")["app"], 
                            formatter_class=ArgumentDefaultsHelpFormatter)
    parser.add_argument("-d", "--dictionary-file",
                        type=str, default=get_defaults()["dictionry"], help=get_defaults("help")["dictionry"])
    parser.add_argument("-l", "--log-file",
                        type=str, default=get_defaults()["log_file"], help=get_defaults("help")["log_file"])
    parser.add_argument("-a", "--answers-file",
                        type=str, default=get_defaults()["answers_file"], help=get_defaults("help")["answers_file"])
    parser.add_argument("-o", "--output--file",
                        type=str, default=get_defaults()["output_file"], help=get_defaults("help")["output_file"])
    parser.add_argument("-s", "--start-date",
                        type=str, default=get_defaults()["start_date"], help=get_defaults("help")["start_date"])
    parser.add_argument("-e", "--end-date",
                        type=str, default=get_defaults()["end_date"], help=get_defaults("help")["end_date"])
    return parser.parse_args()

def get_answer_url(year: int, month: int, day: int) -> str:
    return f"https://www.nytimes.com/svc/wordle/v2/{year}-{month:02d}-{day:02d}.json"

def get_answer_data(year: int, month: int, day: int) -> dict:
    url = get_answer_url(year, month, day)
    response = urlopen(Request(url)).read()
    return json.loads(response)

def get_answer_data_from_file(file_path: str) -> dict:
    with open(file_path, 'r') as f:
        return json.load(f)

def build_answer_list(answer_data: dict) -> list:
    answer_list = []
    if Path(args.answers_file).exists(): # 回答ファイルが存在する場合
        answer_data = get_answer_data_from_file(args.answers_file)
        for answer in answer_data:
             answer_list.append(Answer(solution=answer["solution"], print_date=answer["print_date"]))
    else: # 回答ファイルが存在しない場合
        answer_data = get_answer_data(args.start_date.year, args.start_date.month, args.start_date.day)
        for answer in answer_data:
            answer_list.append(Answer(answer["id"], answer["solution"], answer["print_date"], answer["days_since_launch"]))
    return answer_list

def main():
    x=build_answer_list({})
    print(f'{len(x)} answers found')
#`コマンドライン実行の時の実行シーケンス`
if __name__ == "__main__":
    args = parse_args()
    logger = prepare_logger(args)
    main()