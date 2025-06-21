import os, asyncio, discord, gspread
from datetime import datetime, timezone
from typing import cast
from functools import partial
from google.oauth2.service_account import Credentials
from gspread.utils import ValueInputOption
from dotenv import load_dotenv

# ---------- load secrets ----------
load_dotenv()
TOKEN       = cast(str, os.getenv("TOKEN"))
SHEET_ID    = cast(str, os.getenv("SHEET_ID"))
CHANNEL_IDS = [int(x.strip()) for x in cast(str, os.getenv("CHANNEL_IDS")).split(",")]

# ---------- google credentials ----------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
KEY_PATH = os.path.join(BASE_DIR, "gservice.json")
SCOPES   = ["https://www.googleapis.com/auth/spreadsheets"]

# Authenticate using the service account JSON key and required scopes
# Then open the Google Sheet by its ID and select the first worksheet (sheet1)
CREDS  = Credentials.from_service_account_file(KEY_PATH, scopes=SCOPES)
GSHEET = gspread.authorize(CREDS).open_by_key(SHEET_ID).sheet1

# ---------- config ----------
BATCH_ROWS = 10_000

async def push_rows(rows):
    loop = asyncio.get_running_loop()
    # job is equivalent to GSHEET.append_rows(rows, value_input_option=ValueInputOption.raw)
    job = partial(
        GSHEET.append_rows,
        rows,
        value_input_option=ValueInputOption.raw   # Insert the values exactly as provided
    )
    await loop.run_in_executor(None, job)         # expects a callable with no arguments, such as job

# ---------- discord client ----------
intents = discord.Intents.default()
intents.message_content = True
intents.members = True
client  = discord.Client(intents=intents)

async def dump_channel(ch: discord.TextChannel):
    header_done = False # Ensure only 1 header when multiple channels are being pushed
    rows, total = [], 0 # rows store the collected batch data before pushing, total keeps track of how many messages handled
    after_2024 = datetime(2024, 1, 1, 0, 0, 0, tzinfo=timezone.utc)
    before_2025 = datetime(2025, 1, 1, 0, 0, 0, tzinfo=timezone.utc)

    # limit=None        -> Fetch all available messages in the channel history, If limit=100,fetch the most recent 100 messages
    # oldest_first=True -> Start fetching messages from the oldest to the newest
    async for m in ch.history(limit=None, oldest_first=True, after=after_2024, before=before_2025):
        if not header_done:
            await push_rows([["msg_content", "msg_timestamp", "usr_joined_at"]])
            header_done = True
        # --------------------------------------------------
         # Filter: Skip messages shorter than 5 characters
        if len(m.content.strip()) < 5:
            continue
        # --------------------------------------------------
        rows.append([m.content.replace("\n", " "),
                     int(m.created_at.timestamp() * 1000),
                     int(m.author.joined_at.timestamp() * 1000) if isinstance(m.author, discord.Member) and m.author.joined_at else ""
                    ])
        total += 1
        if len(rows) == BATCH_ROWS:
            await push_rows(rows)
            rows.clear()
            await asyncio.sleep(1)

    # Clean up rows not pushed from batch
    if rows:
        await push_rows(rows)
    print(f"{ch} finished, {total} messages")

@client.event
async def on_ready():
    print("bot logged in, starting export")
    for cid in CHANNEL_IDS:
        ch = client.get_channel(cid)
        if isinstance(ch, discord.TextChannel):
            await dump_channel(ch)
        else:
            print(f"channel {cid} not found or not text")
    await client.close()

if __name__ == "__main__":
    asyncio.run(client.start(TOKEN))