import pygame
import time
import os
import sys

uniqueID = sys.argv[1]

mp3_file = './public/assets/uploads/latest_media_' + uniqueID + '.mp3'
pygame.mixer.init()

try:
    pygame.mixer.music.load(mp3_file)
    print(f"MP3 file loaded: {mp3_file}")
except pygame.error as e:
    print(f"Error loading MP3 file: {e}")
    exit(1)

pygame.mixer.music.play(0)

try:
    while pygame.mixer.music.get_busy():
        print("Audio playing...")
        time.sleep(1)
except KeyboardInterrupt:
    pygame.mixer.music.stop()
    print("Stopping audio playback...")
