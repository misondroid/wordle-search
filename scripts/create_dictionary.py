#!/usr/bin/env python3
from urllib.request import urlopen, Request
from time import sleep
from logging import FileHandler, Formatter, INFO, getLogger
from argparse import ArgumentParser

# loggerの設定
def prepare_logger(args):
    logger = getLogger("create_dictionary")
    handler = FileHandler(args.log_file)
    handler.setFormatter(Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
    logger.addHandler(handler)
    logger.setLevel(INFO)
    return logger

def main():
    args = parse_args()
    create_dictionary(args.input_file, args.output_file)
    logger

if __name__ == "__main__":
    logger = prepare_logger(args)
    main()