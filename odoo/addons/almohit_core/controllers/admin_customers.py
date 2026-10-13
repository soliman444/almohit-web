from odoo import http
from odoo.http import request

from ..services.admin_customers import admin_customer_summary, list_admin_customers
from ..services.api import success
from ..services.staff import require_internal_staff


class AlmohitAdminCustomerController(http.Controller):

    @http.route(
        "/almohit/api/admin/customers/summary",
        type="http",
        auth="user",
        methods=["GET"],
        csrf=False,
    )
    def summary(self, **kwargs):
        _user, err = require_internal_staff("read", "res.partner")
        if err:
            return err
        return success(admin_customer_summary(request.env))

    @http.route(
        "/almohit/api/admin/customers",
        type="http",
        auth="user",
        methods=["GET"],
        csrf=False,
    )
    def list_customers(self, **kwargs):
        _user, err = require_internal_staff("read", "res.partner")
        if err:
            return err
        return success(list_admin_customers(request.env, kwargs))
