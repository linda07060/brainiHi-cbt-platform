import { Controller, Post, Body, UseGuards, Req, Get, Param, Res, HttpCode, Logger, BadRequestException } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PaymentsService } from "./payments.service";
import { Request, Response } from "express";

@Controller("api/payments")
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  private getUserIdFromReq(req: Request): number {
    const user = (req as any).user ?? {};
    const raw = user?.sub ?? user?.id ?? user?.userId ?? null;
    const id = typeof raw === 'string' ? Number(raw) : raw;
    if (!id || Number.isNaN(Number(id))) {
      throw new BadRequestException('Invalid or missing user id');
    }
    return Number(id);
  }

  @Post("create-order")
  @UseGuards(JwtAuthGuard)
  async createOrder(@Req() req: Request, @Body() body: { plan: string; billingPeriod?: string }) {
    const userId = this.getUserIdFromReq(req);
    const plan = body.plan ?? "Pro";
    const billing = body.billingPeriod ?? "monthly";
    const res = await this.paymentsService.createOrder(userId, plan, billing);
    const payment = res?.payment ?? null;
    return { orderID: res.orderID, paymentId: payment?.id ?? null };
  }

  @Post("capture")
  @UseGuards(JwtAuthGuard)
  async capture(@Req() req: Request, @Body() body: { orderID: string }) {
    const userId = this.getUserIdFromReq(req);
    const orderID = body.orderID;
    const saved = await this.paymentsService.captureOrder(userId, orderID);
    return saved;
  }

  /**
   * invoices
   *
   * Returns a curated invoice list to the frontend.
   * - If there is a pending invoice it returns a single-item array containing the latest pending invoice
   *   including derived `reason` and `change_to` where possible.
   * - Otherwise it returns a list of recent paid invoices.
   */
  @Get("invoices")
  @UseGuards(JwtAuthGuard)
  async invoices(@Req() req: Request) {
    const userId = this.getUserIdFromReq(req);
    const items = await this.paymentsService.listInvoicesForUserCurated(userId);

    // Return the shaped objects directly (frontend expects id/date/amount/currency/status/receipt_url and now reason/change_to)
    return items.map((it) => ({
      id: it.id,
      date: it.date,
      amount: it.amount,
      currency: it.currency,
      status: it.status,
      receipt_url: it.receipt_url,
      reason: it.reason ?? null,
      change_to: it.change_to ?? null,
      plan: it.plan ?? null,
    }));
  }

  @Get("payment-method")
  @UseGuards(JwtAuthGuard)
  async paymentMethod(@Req() req: Request) {
    const userId = this.getUserIdFromReq(req);
    const pm = await this.paymentsService.getPaymentMethodPreview(userId);
    return pm;
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard)
  async getPayment(@Req() req: Request, @Param("id") id: string) {
    const userId = this.getUserIdFromReq(req);
    const parsed = Number(id);
    if (!parsed || Number.isNaN(parsed)) throw new BadRequestException('Invalid payment id');
    const p = await this.paymentsService.getPaymentForUser(userId, parsed);
    return p;
  }

  /**
   * check-access
   * Returns structured JSON:
   * { allowed, activeSubscription, hasSuccessfulPayment, plan, plan_expiry, reason? }
   */
  @Get("check-access")
  @UseGuards(JwtAuthGuard)
  async checkAccess(@Req() req: Request) {
    try {
      const user = (req as any).user;
      const raw = user?.sub ?? user?.id ?? user?.userId ?? null;
      const userId = typeof raw === 'string' ? Number(raw) : raw;
      if (!userId || Number.isNaN(Number(userId))) {
        // safe structured response when user id is invalid
        return {
          allowed: false,
          activeSubscription: false,
          hasSuccessfulPayment: false,
          plan: user ? (user.plan ?? 'Free') : 'Free',
          plan_expiry: null,
          reason: 'invalid_user',
        };
      }

      const info = await this.paymentsService.getAccessInfo(Number(userId));
      return {
        allowed: Boolean(info?.allowed ?? false),
        activeSubscription: Boolean(info?.activeSubscription ?? false),
        hasSuccessfulPayment: Boolean(info?.hasSuccessfulPayment ?? false),
        plan: info?.plan ?? (user?.plan ?? 'Free'),
        plan_expiry: info?.plan_expiry ?? null,
        reason: info?.reason ?? null,
        pendingAmount: info?.pendingAmount ?? null,
      };
    } catch (err) {
      this.logger.warn('[payments] checkAccess error', err?.message ?? err);
      const user = (req as any).user ?? {};
      const profilePlan = user?.plan ?? 'Free';
      const isProfileFree = String(profilePlan).toLowerCase().includes('free');
      return {
        allowed: isProfileFree ? true : false,
        activeSubscription: false,
        hasSuccessfulPayment: false,
        plan: profilePlan,
        plan_expiry: null,
        reason: 'internal_error',
      };
    }
  }

  @Post("portal")
  @UseGuards(JwtAuthGuard)
  async portal(@Req() req: Request) {
    this.getUserIdFromReq(req);
    return { url: null };
  }

  @Post("cancel")
  @UseGuards(JwtAuthGuard)
  async cancel(@Req() req: Request) {
    this.getUserIdFromReq(req);
    return { message: "Cancellation via PayPal is handled by PayPal subscriptions. Contact support." };
  }

  @Post("reactivate")
  @UseGuards(JwtAuthGuard)
  async reactivate(@Req() req: Request) {
    this.getUserIdFromReq(req);
    return { message: "Reactivation via PayPal subscriptions must be managed in PayPal. Contact support." };
  }

  // Public webhook endpoint (PayPal)
  @Post("webhook")
  @HttpCode(200)
  async webhook(@Req() req: Request, @Res() res: Response) {
    const event = req.body;
    setImmediate(async () => {
      try {
        await this.paymentsService.handleWebhook(event);
      } catch (err) {
        this.logger.warn("Webhook handler background error", err as any);
      }
    });
    res.json({ received: true });
  }
}