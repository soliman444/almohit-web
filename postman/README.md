نعم، هذه نقطة أساسية جدًا: **الجلسة تحدد من هو المستخدم، لكن الصلاحيات تحدد ماذا يستطيع هذا المستخدم أن يفعل.** وهما شيئان مختلفان.

في Odoo المسار الطبيعي هو:

```text
Login
→ session_id
→ request.env.user
→ Groups / ACL / Record Rules
→ السماح أو المنع
```

يعني عندما يدخل العميل بحساب Portal، كل API تعمل تحت هوية ذلك المستخدم ما لم نستخدم `sudo()`.

### عندكم حاليًا ثلاث حالات مختلفة

**العميل Portal** يستخدم Odoo Session:

```text
POST /auth/login
→ session_id
→ request.env.user = Portal user
```

ثم API مثل:

```text
/cart
/orders
/invoices
/payments
/addresses
```

يجب أن ترى فقط بيانات هذا العميل.

مثلاً عند قراءة الطلبات لا يجوز أن تكون:

```python
request.env["sale.order"].sudo().search([])
```

لأن هذا قد يعرض كل الطلبات.

بل يجب أن تكون مقيدة بالعميل الحالي، مثل المفهوم:

```python
partner = request.env.user.partner_id

orders = request.env["sale.order"].search([
    ("partner_id", "child_of", partner.commercial_partner_id.id),
    ("almohit_storefront_order", "=", True),
])
```

أو استخدام `sudo()` فقط إذا احتجناه تقنيًا، لكن مع Domain صارم مبني على المستخدم الحالي.

---

### Odoo نفسه عنده نظام صلاحيات أصلي

عنده ثلاث طبقات مهمة:

```text
Groups
ACL
Record Rules
```

**Groups** مثل:

```text
Internal User
Portal
Sales User
Sales Manager
Accounting
Inventory
Administration
```

**ACL** تحدد هل الـmodel يسمح:

```text
Read
Create
Write
Delete
```

مثلاً Portal عادة لا يستطيع الكتابة مباشرة على:

```text
account.move
stock.picking
sale.order
```

وهذا جيد.

**Record Rules** تحدد أي سجلات يقدر يشوفها المستخدم، وليس فقط هل يقدر يقرأ الـmodel أم لا.

مثلاً:

```text
يمكنه قراءة sale.order
لكن فقط طلباته
```

وهذه أهم نقطة أمنيًا.

---

## لكن عندكم أحيانًا `sudo()`

هنا يجب الانتباه جدًا.

`sudo()` يعني عمليًا:

> تجاهل صلاحيات المستخدم الحالية ونفذ بصلاحيات مرتفعة.

لذلك مثلًا عندكم `trade.application` كان Portal ممنوعًا من ACL، لكن الـAPI تستخدم `sudo()` بشكل مقيد:

```text
request.env.user.partner_id
↓
server يحدد partner_id بنفسه
↓
sudo().create(...)
```

وهذا مقبول لأن المستخدم لا يستطيع إرسال:

```text
partner_id = شخص آخر
status = approved
reviewed_by = admin
```

السيرفر يحذف/يتجاهل هذه القيم ويحددها بنفسه.

إذن القاعدة المهمة:

> `sudo()` ليس خطأ، لكن يجب استخدامه فقط بعد تحديد Scope المستخدم بدقة.

---

# مثال حسب أدوار مشروعك

### Customer / Portal

يسمح له:

```text
عرض المنتجات
رؤية سعره إذا Approved
إدارة سلته
إدارة عناوينه
إنشاء الطلب
رؤية طلباته
رؤية فواتيره
رؤية دفعاته
إنشاء طلب Trade Application
```

ولا يسمح له:

```text
Approve Trade Application
تعديل سعر المنتج
إنشاء منتج
تعديل Invoice
Register Payment
Validate Delivery
اختيار Distributor
```

---

### Odoo Sales Staff

حسب Groups في Odoo يمكنه مثلاً:

```text
Sales Orders
Customers
Create Invoice
```

لكن ليس بالضرورة:

```text
Accounting configuration
Inventory validation
System settings
```

---

### Accountant

يمكنه:

```text
Post Invoice
Register Payment
Reconciliation
```

ولا يفترض تلقائيًا أن يستطيع:

```text
تعديل المنتجات
إدارة المستخدمين
```

---

### Warehouse / Distributor Staff

يمكن أن تسمح له فقط:

```text
Stock Picking
Responsible
Validate delivery
```

حسب الدور الذي تعطيه له.

---

# والـAPI يجب ألا تقرر الدور من بيانات يرسلها المستخدم

شيء مثل هذا خطأ:

```json
{
  "role": "admin"
}
```

ثم API تصدقه.

الصحيح:

```text
session_id
→ request.env.user
→ user.has_group(...)
```

مثلاً endpoint إداري:

```python
if not request.env.user.has_group("sales_team.group_sale_manager"):
    return error("ACCESS_DENIED", ...)
```

أو تعتمد ببساطة على ORM وACL إذا لم تستخدم `sudo()`.

---

# عندكم حاليًا حالة إضافية مهمة

في Website Admin ما زال عندكم حسب البنية الحالية:

```text
wholesale_session
→ Prisma staff RBAC
```

ثم Next.js server يستخدم **Odoo service account داخلي** للوصول إلى admin API.

يعني عندكم الآن نظامان للصلاحيات للموظفين:

```text
Website staff permissions
→ legacy Prisma RBAC

Odoo staff permissions
→ Odoo groups / ACL
```

وهذا يعمل، لكنه ليس الشكل النهائي المثالي.

مستقبلاً الأفضل أن يصبح:

```text
Staff login
→ Odoo internal user
→ Odoo Groups
→ نفس الصلاحيات في الموقع وOdoo
```

وبذلك يكون Odoo هو مصدر الحقيقة للصلاحيات أيضًا.

---

# ماذا يعني هذا لمطور تطبيق الموبايل؟

إذا التطبيق خاص **بالعملاء فقط**، فهذا سهل:

```text
Mobile Login
→ Odoo Portal session
→ Customer APIs
```

ولا يحتاج مطور التطبيق معرفة صلاحيات الموظفين.

أما إذا ستعمل لاحقًا تطبيقًا للموظفين/الموزعين، هنا يجب أن يكون عندنا API منفصلة منطقيًا مثل:

```text
/admin/...
/staff/...
/distribution/...
```

وتتحقق من Odoo Groups لكل endpoint.

---

## القاعدة التي أنصح تعتمدها للمشروع

كل endpoint نسأله 3 أسئلة:

```text
1. من يجب أن يستطيع استدعاءه؟
2. أي Records يستطيع رؤيتها/تعديلها؟
3. هل فيه sudo()؟ وإذا نعم، لماذا؟
```

مثلاً:

| API | المستخدم | Scope |
|---|---|---|
| `/cart` | Portal Customer | سلة العميل فقط |
| `/orders` | Portal Customer | طلباته فقط |
| `/invoices` | Portal Customer | فواتيره فقط |
| `/trade/application` | Portal Customer | طلبه فقط |
| `/admin/products` | Internal/authorized staff | حسب صلاحيات الموظف |
| Validate Delivery | Inventory staff | حسب Odoo group |
| Register Payment | Accounting staff | حسب Odoo group |

الخلاصة: **`session_id` لا يعطي صلاحيات بحد ذاته؛ هو فقط يحدد هوية المستخدم. Odoo Groups + ACL + Record Rules + القيود داخل Controllers هي التي تحدد ما يستطيع فعله.**

وأهم شيء نراجعه قبل تسليم الـAPI لمطور التطبيق هو أن أي endpoint يستخدم `sudo()` لا يسمح للمستخدم بتغيير `partner_id` أو الوصول إلى سجلات عميل آخر.