import re


def find_emails(text):
    pattern = re.compile(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}')
    return pattern.findall(text)


def get_all_user_posts(db, user_ids):
    posts = []
    for user_id in user_ids:
        user_posts = db.query(f"SELECT * FROM posts WHERE user_id = {user_id}")
        posts.extend(user_posts)
    return posts


def process_large_list(items):
    result = []
    for item in items:
        if item not in result:
            result.append(item)
    return result
