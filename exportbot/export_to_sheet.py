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
    rows, total = [], 0 # rows store the collected batch data before pushing, total keeps track of how many messages handled
    after_2024 = datetime(2024, 1, 1, 0, 0, 0, tzinfo=timezone.utc)
    before_2026 = datetime(2026, 1, 1, 0, 0, 0, tzinfo=timezone.utc)

    # limit=None        -> Fetch all available messages in the channel history, If limit=100,fetch the most recent 100 messages
    # oldest_first=True -> Start fetching messages from the oldest to the newest
    async for m in ch.history(limit=None, oldest_first=True, after=after_2024, before=before_2026):
        # Filter: Skip messages that are not at least 4 words
        if len(m.content.split()) <= 3:
            continue
        
        # Filter: Skip messages that are not real user messages
        # Skipped: Forwarded messages, Stickers, bot messages
        if m.type != discord.MessageType.default:
            continue

        # Features
        content = m.content.replace("\n", " "),
        msg_timestamp = int(m.created_at.timestamp() * 1000)
        joined_timestamp = int(m.author.joined_at.timestamp() * 1000) if isinstance(m.author, discord.Member) and m.author.joined_at else ""
        time_since_join = (m.created_at - m.author.joined_at).total_seconds() if isinstance(m.author, discord.Member) and m.author.joined_at else ""
        message_length = len(m.content)
        word_count = len(m.content.split())
        has_link = int("http" in m.content.lower())
        has_mention = int(len(m.mentions) > 0)
        num_roles = len(m.author.roles) if isinstance(m.author, discord.Member) else ""

        rows.append([
            content,
            msg_timestamp,
            joined_timestamp,
            time_since_join,
            message_length,
            word_count,
            has_link,
            has_mention,
            num_roles,
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

    # Set header for sheet
    await push_rows([[
                "msg_content", "msg_timestamp", "usr_joined_at",
                "time_since_join", "message_length", "word_count",
                "has_link", "has_mention", "num_roles"
            ]])
    
    for cid in CHANNEL_IDS:
        ch = client.get_channel(cid)
        if isinstance(ch, discord.TextChannel):
            await dump_channel(ch)
        else:
            print(f"channel {cid} not found or not text")
    await client.close()

if __name__ == "__main__":
    asyncio.run(client.start(TOKEN))