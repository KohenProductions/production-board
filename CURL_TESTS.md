# פקודות curl לבדיקה מהירה

החלף `BASE=http://localhost:3000` אם השרת רץ על פורט/הוסט אחר.
שמור את ה-cookie מהתחברות עם `-c cookies.txt` והשתמש ב-`-b cookies.txt` בבקשות מאוחרות.

---

## 1. הרשמה

```bash
BASE=http://localhost:3000

curl -s -X POST "$BASE/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser1","password":"secret123"}' | jq .
# מצופה: {"success":true,"userId":"..."}
```

בדיקת validation – username לא חוקי (קצר מדי / תווים לא חוקיים):

```bash
curl -s -X POST "$BASE/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"username":"ab","password":"secret123"}' | jq .
# מצופה: 400 + הודעת שגיאה על שם משתמש 3–24 תווים
```

---

## 2. התחברות

```bash
curl -s -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser1","password":"secret123"}' \
  -c cookies.txt -v 2>&1 | tail -20
# מצופה: 200 + Set-Cookie: pb_session=...
```

---

## 3. me מחזיר avatarUrl (ו־firstName/lastName)

```bash
curl -s "$BASE/api/auth/me" -b cookies.txt | jq .
# מצופה: {"user":{"id":"...","username":"testuser1","avatarUrl":null,"firstName":null,"lastName":null,...}}
```

---

## 4. עדכון פרופיל

```bash
curl -s -X POST "$BASE/api/user/profile" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"firstName":"ישראל","lastName":"ישראלי","age":30,"email":"a@b.co"}' | jq .
# מצופה: {"success":true}

curl -s "$BASE/api/auth/me" -b cookies.txt | jq .user
# מצופה: firstName, lastName, age, email מעודכנים
```

---

## 5. יצירת פרויקט רביעי נחסמת (403)

יוצרים 3 פרויקטים ואז מנסים פרויקט רביעי:

```bash
for i in 1 2 3; do
  curl -s -X POST "$BASE/api/projects" \
    -H "Content-Type: application/json" \
    -b cookies.txt \
    -d "{\"name\":\"פרויקט $i\"}" | jq .
done

curl -s -X POST "$BASE/api/projects" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"name":"פרויקט 4"}' | jq .
# מצופה: 403 + "הגעת למגבלת 3 פרויקטים בגרסה החינמית"
```

---

## 6. אופציונלי: עדכון avatar

```bash
curl -s -X POST "$BASE/api/user/avatar" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"avatarUrl":"https://example.com/photo.jpg"}' | jq .

curl -s "$BASE/api/auth/me" -b cookies.txt | jq .user.avatarUrl
# מצופה: "https://example.com/photo.jpg"
```
