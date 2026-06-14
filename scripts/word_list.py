#!/usr/bin/env python3
import gzip
import json
from urllib.request import urlopen, Request
from time import sleep
from pathlib import Path
from logging import FileHandler, Formatter, INFO, getLogger
from argparse import ArgumentParser, ArgumentDefaultsHelpFormatter, RawTextHelpFormatter
from datetime import date, timedelta
from pprint import pprint
from typing import List, Dict, Any
#
dictionary_url = "https://raw.githubusercontent.com/dwyl/english-words/master/words_dictionary.json"

# 過去問データ用のクラス
class Answer:
    def __init__(self, id: int=False, solution: str=False, 
                 days_since_launch: int=False, editor: str=False, print_date: str=False):
        self.id = id
        self.solution = solution
        self.days_since_launch = days_since_launch
        self.editor = editor
        self.print_date = print_date

    def to_dict_date_key(self):
        return {self.print_date: {
                "id": self.id,
                "solution": self.solution,
                "days_since_launch": self.days_since_launch,
                "editor": self.editor
            }
        }
    def to_dict(self):
        return self.__dict__
    def from_dict(self, data: Dict[str, Any]):
        self.id = data.get('id')
        self.solution = data.get('solution')
        self.days_since_launch = data.get('days_since_launch')
        self.editor = data.get('editor')
        self.print_date = data.get('print_date')
        return self
    def from_dict_date_key(self, data: Dict[str, Dict[str, Any]]):
        for key, values in data.items():
            self.id = values.get('id')
            self.solution = values.get('solution')
            self.days_since_launch = values.get('days_since_launch')
            self.editor = values.get('editor')
            self.print_date = key
            return self


#コマンドラインヘルプのフォーマットを設定
class RawTextArgumentDefaultsHelpFormatter(ArgumentDefaultsHelpFormatter, RawTextHelpFormatter):
    pass

# 自分自身のスクリプト名を取得
def get_self_script_name():
    return Path(__file__).stem



# loggerの設定
def prepare_logger(args):
    logger = getLogger(get_self_script_name())
    handler = FileHandler(args.log_file)
    handler.setFormatter(Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
    logger.addHandler(handler)
    logger.setLevel(INFO)
    return logger

def get_defaults(selector: str = "values"):
    data ={
        "commands": ["create", "download", "pull", "update"],
        "command_help": (
            "create: 単語リストファイルを作成します\n"
            "download: ベースになる辞書ファイルをダウンロードします\n"
            "pull: 回答ファイルを公式アーカイブから取得します"
            "update: 回答ファイルを更新します"
        ),
        "values": {
            "dictionry": "words_dictionary.json",
            "log_file": f"{get_self_script_name()}.log",
            "answers_file": "answers.json",
            "output_file": "words.json.gz",
            "start_date": (date.today() - timedelta(days=1)).isoformat(),
            "end_date": "2026-05-30"
        },
        "help": {
            "dictionry": "ベースの辞書ファイル名",
            "log_file": "ログファイル名",
            "answers_file": "過去問の追回答ファイル名",
            "output_file": "出力ファイル名",
            "start_date": "過去問の取得開始日(YYYY-MM-DD) ※当日だとネタバレや取得失敗の可能性があるので、前日以前を指定してください",
            "end_date": "過去問の取得終了日(YYYY-MM-DD) ※2021-06-19以前のデータは取得できません"
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
                            formatter_class=RawTextArgumentDefaultsHelpFormatter)
    parser.add_argument('command',choices=get_defaults("commands"),help=get_defaults("command_help"))
    parser.add_argument("-d", "--dictionary-file",
                        type=str, default=get_defaults()["dictionry"], help=get_defaults("help")["dictionry"])
    parser.add_argument("-l", "--log-file",
                        type=str, default=get_defaults()["log_file"], help=get_defaults("help")["log_file"])
    parser.add_argument("-a", "--answers-file",
                        type=str, default=get_defaults()["answers_file"], help=get_defaults("help")["answers_file"])
    parser.add_argument("-o", "--output-file",
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
    try:
        response = urlopen(Request(url)).read()
    except Exception as e:
        logger.error(f"error -> {e}")
        print(f"{year}/{month:02d}/{day:02d}分の過去問の取得に失敗しました -> {e}")
        return False
    return json.loads(response)

def get_answer_data_from_file(file_path: str) -> dict:
    answers = []
    try:
        with open(file_path, 'r') as f:
            data = json.load(f)
    except Exception as e:
        logger.error(f"error -> {e}")
        print(f"回答ファイルの読み込みに失敗しました -> {e}")
        return []
    return [Answer(**item) for item in data]



#指定した期間の回答データを取得
def build_answer_list(start_date: str, end_date: str) -> list:
    print(f'build_answer_list():got start_date->{start_date} and end_date->{end_date}')
    answer_list = []
    start_date = date.fromisoformat(start_date)
    end_date = date.fromisoformat(end_date)
    current_date = start_date
    while current_date >= end_date:
        print(f'build_answer_list():trying -> {current_date.year}-{current_date.month:02d}-{current_date.day:02d}')
        answer = Answer(**get_answer_data(
                current_date.year, 
                current_date.month, 
                current_date.day))
        if not answer:
            continue
        logger.info(f'build_answer_list():got -> {answer.to_dict()}')
        answer_list.append(answer.to_dict_date_key())
        sleep(0.1)
        current_date -= timedelta(days=1)
    return answer_list

def load_dictionary()-> dict:
    local_dictionary_file = Path(args.dictionary_file)
    if local_dictionary_file.exists():
        with open(local_dictionary_file, 'r') as f:
            data = json.load(f).keys()
    else:
        print("辞書ファイルが見つかりません")
        data = get_dictionary_from_url()
    return shrink_word_list(data)

def get_dictionary_from_url() -> dict:
    print(f"'english-words'から辞書を取得します: {dictionary_url}")
    try:
        response = urlopen(Request(dictionary_url))
        return json.loads(response.read())
    except Exception as e:
        logger.error(f"error -> {e}")
        print(f"辞書取得に失敗しました: {e}")
        return {}

def shrink_word_list(word_list: list) -> list:
    word_list = word_list.keys()
    return [word for word in word_list if len(word) == 5]

def save_answer_list(answer_list: list, file_path: str, encoding: str = 'utf-8', 
                    compress: bool = False,indent: int = 4) -> None:
    if compress:
        with gzip.open(file_path, 'wt', encoding=encoding) as f:
            json.dump(answer_list, f, indent=indent)
    else:
        with open(file_path, 'w', encoding=encoding) as f:
            json.dump(answer_list, f, indent=indent)

def save_word_list(word_list: list, file_path: str, encoding: str = 'utf-8', 
                    compress: bool = False) -> None:
    if compress:
        with gzip.open(file_path, 'wt', encoding=encoding) as f:
            json.dump(word_list, f)
    else:
        with open(file_path, 'w', encoding=encoding) as f:
            json.dump(word_list, f)

def update_answer_list(answer_list: list=[], file_path: str=False) -> None:
    dates_to_get_answer = []
    answers = extract_answers_to_dict(get_answer_data_from_file(file_path))
    end_date = date.fromisoformat(args.end_date)
    current_date = date.fromisoformat(args.start_date)
    while current_date >= end_date:
        if date.isoformat(current_date) not in answers.keys():
            dates_to_get_answer.append(date.isoformat(current_date))
        current_date -= timedelta(days=1)
    print(f'{len(dates_to_get_answer)}個の過去問が取得されていません')
    for item in dates_to_get_answer:
        current_date = date.fromisoformat(item)
        answers[item] = Answer().from_dict(data=get_answer_data(
                current_date.year, 
                current_date.month, 
                current_date.day)).to_dict_date_key()
        if not answers.get(item):
            continue
        logger.info(f'build_answer_list():got -> {answers[item]}')
        sleep(0.1)
        current_date -= timedelta(days=1)
    return transpose_answers_to_list(answers)

def extract_answers_to_dict(answers: List[Answer]) -> Dict[str, Dict[str, Any]]:
    return {answer.print_date: answer.to_dict_date_key() for answer in answers}

def transpose_answers_to_list(_answers: Dict[str, Dict[str, Any]]) -> List[Dict[str, Any]]:
    answers = []
    for key, values in _answers.items():
        answers.extend(Answer().from_dict_date_key(values))
    return answers


def main():
    if args.command == "create":
        answer_list = build_answer_list({})
        print(f'{len(answer_list)} answers found')
        dictionary = load_dictionary()
        print(f'{len(dictionary)} words found')
        for answer in answer_list:
            if answer.solution not in dictionary:
                dictionary[answer.solution] = answer.print_date
        print(f'{len(dictionary)} words found')
        save_word_list(dictionary, args.output_file, gzip=True)
        print(f'{args.output_file} created')
    elif args.command == "download":
        dictionary_file = Path(args.dictionary_file)
        if dictionary_file.exists():
            print(f'{args.dictionary_file} already exists')
            return
        save_word_list(shrink_word_list(get_dictionary_from_url()), dictionary_file)
        print(f'{args.dictionary_file} created')
    elif args.command == "pull":
        answer_list = build_answer_list(args.start_date, args.end_date)
        save_answer_list(answer_list, args.answers_file)
        print(f'{len(answer_list)} answers found')
    elif args.command == "update":
        updated_answers = update_answer_list(file_path=args.answers_file)
        save_answer_list(updated_answers, args.answers_file)
        print(f'{len(updated_answers)} answers updated')

#`コマンドライン実行の時の実行シーケンス`
if __name__ == "__main__":
    args = parse_args()
    logger = prepare_logger(args)

    main()