نعم، أقدر الآن أعطيك خطة **مبنية على ملف الخدمة نفسه** وليس كلامًا عامًا.

راجعت أحدث نسخة التي أرسلتها. الخدمة عندك بالفعل مجهزة بشكل جيد للاستضافة:
- `Dockerfile` يثبت `chromium`
- `CHROME_PATH=/usr/bin/chromium`
- `headless: true`
- `--no-sandbox`
- `--disable-setuid-sandbox`
- `--disable-dev-shm-usage`
- `autoClose: 0`
- تخزين الجلسة تحت `/data`
- إزالة `SingletonLock`
- `/health`
- `/session`
- `/unlink`

إذن الكود نفسه **قريب جدًا من الجاهزية للإنتاج**. المشكلة الحالية على الأغلب في **طريقة تشغيله على السيرفر**.

### ما أراه من الكود

عند startup:

```text
startWhatsApp()
→ create(...)
→ executablePath = CHROME_PATH
→ userDataDir = /data/chrome-profile
```

إذا `create()` يفشل، الكود يفعل:

```text
status = error
```

وهذا يطابق تمامًا ما يظهر لك في `/health`.

لذلك التشخيص الآن صار ضيق جدًا:
**إما Chromium غير موجود في البيئة التي شُغلت منها الخدمة، أو الخدمة لم تُشغّل من Dockerfile الذي أرسلته، أو لا تستطيع الكتابة إلى `/data`, أو الاستضافة تمنع تشغيل Chromium.**

### الحل الذي أنصح به خطوة بخطوة

1. **إجبار مسؤول الاستضافة على تشغيل خدمة WhatsApp من Dockerfile الموجود في repo، وليس Node مباشرة.**

يعني لا يعمل:

```bash
npm install
npm start
```

على السيرفر مباشرة.

بل يبني:

```bash
docker build -t almohit-whatsapp ./services/almohit-whatsapp
```

ثم يشغل الـcontainer.

السبب: Dockerfile عندك هو الذي يضمن وجود:

```text
chromium
fonts
ca-certificates
CHROME_PATH
```

إذا شغّل Node مباشرة خارج Docker، `CHROME_PATH=/usr/bin/chromium` قد يشير إلى ملف غير موجود.

2. **خدمة WhatsApp يجب أن يكون لها volume دائم لـ `/data`.**

مثل:

```yaml
volumes:
  - whatsapp_data:/data
```

لأن عندك في الكود:

```text
/data/tokens
/data/chrome-profile
```

إذا `/data` غير writable أو غير persistent، الجلسة ستفشل أو تضيع.

3. **لا نحتاج الاعتماد على `shm_size` بنفس القوة التي كنا نعتقدها.**

هذه نقطة مهمة بعد قراءة الكود.

أنت بالفعل تمرر:

```text
--disable-dev-shm-usage
```

وهذا يجعل Chromium يستخدم `/tmp` بدل الاعتماد الكبير على `/dev/shm`.

إذن `shm_size: 1gb` مفيد لكنه **ليس الشرط الأول الآن**.

4. **نفحص Chromium داخل نفس container.**

هذه أهم خطوة على الإطلاق:

```bash
docker exec -it almohit_whatsapp sh
```

ثم:

```bash
which chromium
chromium --version
```

المتوقع:

```text
/usr/bin/chromium
Chromium ...
```

إذا هذا يفشل، انتهى التشخيص: الـcontainer لم يُبنَ من Dockerfile الصحيح.

5. **نفحص متغير البيئة.**

داخل container:

```bash
echo $CHROME_PATH
```

المفروض:

```text
/usr/bin/chromium
```

6. **نفحص `/data`.**

داخل container:

```bash
ls -ld /data
touch /data/test
rm /data/test
```

إذا `touch` يفشل، الخدمة لن تستطيع حفظ profile والجلسة.

7. **نشغل Chromium يدويًا داخل الـcontainer.**

هذا الاختبار الحاسم:

```bash
chromium \
  --headless \
  --no-sandbox \
  --disable-setuid-sandbox \
  --disable-dev-shm-usage \
  --disable-gpu \
  --dump-dom https://web.whatsapp.com
```

إذا رجع HTML، Chromium نفسه يعمل.

إذا فشل، الخطأ الذي سيظهر هو السبب الحقيقي.

8. **نقرأ logs للخدمة.**

```bash
docker logs almohit_whatsapp --tail 300
```

نبحث عن السطور بعد:

```text
failed to start WhatsApp Web session
```

ونحتاج الخطأ النصي الكامل.

### لماذا أقول إن الحل الأقوى هو Docker؟

لأن Dockerfile عندك صريح جدًا:

```dockerfile
FROM node:20-bookworm-slim
RUN apt-get install chromium ...
ENV CHROME_PATH=/usr/bin/chromium
```

يعني لو مسؤول الاستضافة يستخدم هذا Dockerfile فعلًا، فأنت تتحكم في بيئة Chromium نفسها، ولا تعتمد على ما هو مثبت على السيرفر.

وهذا يجعل الحل portable أكثر بكثير.

### الشكل الصحيح الذي أريده على السيرفر

```text
Odoo
→ خدمة مستقلة

almohit_whatsapp container
├── Node 20
├── Chromium
├── /data persistent volume
└── port 3000
```

والمسار الخارجي:

```text
https://watrading.m-arabi.com
→ reverse proxy
→ localhost/container:3000
```

### إذا كان لا يستخدم Docker

هنا ستظل الخدمة ممكنة، لكن لازم يثبت يدويًا:
- Node 20
- Chromium
- fonts
- writable data dir
- env vars

وهذا أكثر عرضة للأخطاء.

### ما الذي أطلبه منه بالضبط؟

ليس “جرب Chromium”.

بل هذه الأوامر فقط:

```bash
docker ps
docker exec almohit_whatsapp which chromium
docker exec almohit_whatsapp chromium --version
docker exec almohit_whatsapp sh -c 'echo $CHROME_PATH'
docker exec almohit_whatsapp sh -c 'ls -ld /data && touch /data/test && rm /data/test'
docker logs almohit_whatsapp --tail 300
```

إذا `docker ps` نفسه غير موجود، نعرف أنه لا يستخدم Docker، وساعتها ننتقل لمسار system service/PM2.

### خلاصة رأيي بعد قراءة الكود

الكود الحالي **ليس هو المشكلة الأولى**. هو أصلًا يتضمن أغلب إصلاحات الاستضافة المهمة.

الاحتمال الأقوى:
- خدمة WhatsApp لم تُشغّل من Dockerfile الموجود عندك
- أو الـcontainer لا يملك `/data` writable
- أو البيئة تمنع Chromium رغم وجوده

إذا تريد، أقدر في الرسالة التالية أجهز لك **docker-compose نهائي لخدمة WhatsApp فقط** مطابق 100% لهذا الكود، بحيث ترسله لمسؤول الاستضافة ويشغله حرفيًا.