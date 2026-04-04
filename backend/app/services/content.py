"""Built-in sample dialogues."""
SAMPLE_DIALOGUES = [
    {
        "id": "coffee_shop",
        "title": "At the Coffee Shop",
        "lines": [
            {"speaker": "A", "text": "Hi, can I get a large latte, please?",
             "translation": "안녕하세요, 라떼 큰 사이즈로 한 잔 주세요."},
            {"speaker": "B", "text": "Sure! Would you like that hot or iced?",
             "translation": "물론이죠! 따뜻하게 드릴까요, 아이스로 드릴까요?"},
            {"speaker": "A", "text": "Iced, please. And can I add an extra shot?",
             "translation": "아이스로 주세요. 그리고 샷 추가할 수 있나요?"},
            {"speaker": "B", "text": "Of course. That will be five fifty.",
             "translation": "물론이죠. 5달러 50센트입니다."},
            {"speaker": "A", "text": "Here you go. Thanks a lot!",
             "translation": "여기 있어요. 감사합니다!"},
        ]
    },
    {
        "id": "job_interview",
        "title": "Job Interview",
        "lines": [
            {"speaker": "A", "text": "Thank you for coming in today. Please have a seat.",
             "translation": "오늘 와주셔서 감사합니다. 앉으세요."},
            {"speaker": "B", "text": "Thank you. I am really excited about this opportunity.",
             "translation": "감사합니다. 이번 기회가 정말 기대됩니다."},
            {"speaker": "A", "text": "Can you tell me a little about yourself?",
             "translation": "자기소개를 해주시겠어요?"},
            {"speaker": "B", "text": "Sure. I have been working in marketing for five years.",
             "translation": "네. 저는 5년간 마케팅 분야에서 일해왔습니다."},
            {"speaker": "A", "text": "That sounds great. What made you apply for this role?",
             "translation": "훌륭하네요. 이 직무에 지원하게 된 이유가 무엇인가요?"},
        ]
    },
    {
        "id": "making_plans",
        "title": "Making Plans",
        "lines": [
            {"speaker": "A", "text": "Hey, are you free this Saturday?",
             "translation": "이번 토요일에 시간 있어요?"},
            {"speaker": "B", "text": "I think so. What did you have in mind?",
             "translation": "그럴 것 같아요. 무슨 계획 있어요?"},
            {"speaker": "A", "text": "I was thinking we could check out that new restaurant downtown.",
             "translation": "시내에 새로 생긴 식당을 가보면 어떨까 했어요."},
            {"speaker": "B", "text": "Oh, I have heard really good things about that place.",
             "translation": "아, 거기 정말 좋다는 얘기 들었어요."},
            {"speaker": "A", "text": "Great! Let us meet around seven.",
             "translation": "좋아요! 7시쯤 만나요."},
        ]
    },
]

def get_all_dialogues():
    return [{"id": d["id"], "title": d["title"], "line_count": len(d["lines"])}
            for d in SAMPLE_DIALOGUES]

def get_dialogue(dialogue_id: str):
    return next((d for d in SAMPLE_DIALOGUES if d["id"] == dialogue_id), None)
