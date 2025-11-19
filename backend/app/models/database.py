from supabase import create_client, Client
import os
from dotenv import load_dotenv

load_dotenv()

# Supabase configuration
supabase: Client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_KEY")
)

def get_db():
    return supabase

# Base class for SQLModel (for future use with proper ORM)
class Base:
    pass

# Engine placeholder for SQLModel
engine = None