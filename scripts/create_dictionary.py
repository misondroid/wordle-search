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
#
dictionary_url = "https://raw.githubusercontent.com/dwyl/english-words/master/words_dictionary.json"


#コマンドラインヘルプのフォーマットを設定
class RawTextArgumentDefaultsHelpFormatter(ArgumentDefaultsHelpFormatter, RawTextHelpFormatter):
    pass


class Answer:
    def __init__(self, solution: str, print_date: str):
        self.solution = solution
        self.print_date = print_date



# loggerの設定
def prepare_logger(args):
    logger = getLogger("create_word_list")
    handler = FileHandler(args.log_file)
    handler.setFormatter(Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
    logger.addHandler(handler)
    logger.setLevel(INFO)
    return logger

def get_defaults(selector: str = "values"):
    data ={
        "commands": ["create", "download", "pull"],
        "command_help": (
            "create: 単語リストファイルを作成します\n"
            "download: ベースになる辞書ファイルをダウンロードします\n"
            "pull: 回答ファイルを公式アーカイブから取得します"
        ),
        "values": {
            "dictionry": "words_dictionary.json",
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
        print(f"回答ファイルが存在しないので、公式アーカイブから回答を取得します")
        # for answer in answer_data:
        #     answer_list.append(Answer(answer["id"], answer["solution"], answer["print_date"], answer["days_since_launch"]))
    return answer_list

def load_dictionary()-> dict:
    local_dictionary_file = Path(args.dictionary_file)
    if local_dictionary_file.exists():
        with open(local_dictionary_file, 'r') as f:
            data = json.load(f).keys()
    else:
        print("辞書ファイルが見つかりません")
        data = get_dictionary_from_url()
    return [_ for _ in data if len(_) == 5]


def get_dictionary_from_url() -> dict:
    print(f"'english-words'から辞書を取得します: {dictionary_url}")
    try:
        response = urlopen(Request(dictionary_url))
        return json.loads(response.read())
    except Exception as e:
        logger.error(f"error -> {e}")
        print(f"辞書取得に失敗しました: {e}")
        return {}

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
        with gzip.open(args.output_file, 'wt', encoding='utf-8') as f:
            json.dump(dictionary, f)
        print(f'{args.output_file} created')
    elif args.command == "download":
        download_dictionary()
    elif args.command == "pull":
        pull_answers()
#`コマンドライン実行の時の実行シーケンス`
if __name__ == "__main__":
    args = parse_args()
    logger = prepare_logger(args)
    main()