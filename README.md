# 🏝 제주 부동산 사이트 v2

---

## 📁 파일 구조

```
📁 jeju-realestate/
├── index.html                  # 메인 (건드리지 마세요)
├── data/
│   ├── listings.json           # ✅ 매물 관리 (여기만 수정!)
│   ├── config.json             # ✅ 연락처·환율 (여기만 수정!)
│   └── lang.json               # 3개국어 텍스트
├── assets/
│   ├── css/style.css
│   └── js/app.js
└── images/
    ├── hero.jpg                # 메인 배경 이미지
    └── listings/
        ├── 1/                  # 매물 ID=1 사진 폴더
        │   ├── thumb.jpg       # 썸네일 (640×480)
        │   ├── 1.jpg           # 상세사진1 (1200×800)
        │   └── 2.jpg           # 상세사진2
        ├── 2/
        │   ├── thumb.jpg
        │   └── 1.jpg
        └── ...
```

---

## 🖼️ 매물 사진 올리는 방법

### 사진 권장 규격
| 종류 | 크기 | 용량 |
|------|------|------|
| 썸네일 | 640 × 480px | 100KB 이하 |
| 상세사진 | 1200 × 800px | 100KB 이하 |
| 장수 | 최대 5장 | - |

### 스마트폰 사진 용량 줄이는 방법
카카오톡으로 본인한테 전송 후 저장하면 자동 압축됩니다!

### GitHub에 사진 올리기
1. GitHub 저장소에서 `images/listings/` 폴더 클릭
2. 매물 번호 폴더 클릭 (예: `1`)
3. **"Add file"** → **"Upload files"** 클릭
4. 사진 업로드 후 파일명을 `thumb.jpg`, `1.jpg`, `2.jpg` 로 저장

---

## ✏️ 매물 추가 방법

`data/listings.json` 에서 마지막 매물 아래에 추가:

```json
{
  "id": 7,
  "type": "아파트",
  "deal": "매매",
  "title_ko": "매물 제목",
  "title_en": "Title",
  "title_zh": "标题",
  "location_ko": "제주시 어딘가",
  "location_en": "Somewhere, Jeju",
  "location_zh": "济州市某处",
  "price_krw": 350000000,
  "monthly_deposit": null,
  "monthly_rent": null,
  "area_m2": 84,
  "floor": "5/15층",
  "built_year": 2020,
  "parking": true,
  "desc_ko": "매물 설명",
  "desc_en": "Description",
  "desc_zh": "描述",
  "images": ["thumb.jpg", "1.jpg", "2.jpg"],
  "featured": false
}
```

그리고 `images/listings/7/` 폴더 만들어서 사진 업로드!

---

## 📞 연락처 변경

`data/config.json`:
```json
"contact": {
  "phone": "010-1234-5678",
  "kakao": "https://open.kakao.com/o/링크",
  "wechat": "위챗아이디"
}
```

## 💰 환율 변경

`data/config.json`:
```json
"exchange": {
  "usd": 0.00075,
  "cny": 0.0054
}
```
