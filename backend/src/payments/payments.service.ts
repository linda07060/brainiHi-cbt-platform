import { Injectable, Logger, BadRequestException, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource, In } from "typeorm";
import { Payment } from "./payments.entity";
import { createOrderOnPayPal, captureOrderOnPayPal, getOrderOnPayPal } from "./paypal.client";
import { User } from "../user/user.entity";

/**
 * Shape of the access info returned by getAccessInfo / checkAccess.
 * Includes optional pendingAmount (formatted string) used by the frontend tooltip.
 */
export interface AccessInfo {
  allowed: boolean;
  activeSubscription: boolean;
  hasSuccessfulPayment: boolean;
  plan: string | null;
  plan_expiry: string | null;
  reason?: string | null;
  pendingAmount?: string | null;
}

/**
 * Invoice DTO returned to the frontend by listInvoicesForUser
 */
export interface InvoiceDTO {
  id: number | string;
  date: string | Date;
  amount: string;
  currency: string;
  status: string;
  receipt_url: string;
  reason?: "change_plan" | "past_due" | "next_due" | "regular" | "unknown";
  change_to?: string | null;
  plan?: string | null;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    private readonly dataSource: DataSource,
  ) {}

  /* ---------- Helpers ---------- */

  private ensureValidUserId(userId: any): number {
    const id = typeof userId === "string" ? Number(userId) : userId;
    if (!id || Number.isNaN(Number(id))) {
      throw new BadRequestException("Invalid user id");
    }
    return Number(id);
  }

  private mapPlanPrice(plan: string, billingPeriod?: string) {
    const p = (plan || "Pro").toLowerCase();
    if (p === "pro") {
      if (billingPeriod === "yearly") return { amount: "99.00", currency: "USD" };
      return { amount: "12.99", currency: "USD" };
    }
    if (p === "tutor") {
      if (billingPeriod === "yearly") return { amount: "199.00", currency: "USD" };
      return { amount: "24.99", currency: "USD" };
    }
    return { amount: "0.00", currency: "USD" };
  }

  private formatAmount(value: any): string {
    try {
      const n = Number(value ?? 0);
      if (Number.isFinite(n)) return n.toFixed(2);
      return String(value);
    } catch {
      return String(value ?? "0.00");
    }
  }

  /* ---------- Public API (create / capture / list / get) ---------- */

  /**
   * createOrder: updated to reuse existing pending payment row for the user+plan+billingPeriod
   * - If a pending payment exists for same user+plan+billingPeriod, return it (idempotent).
   * - If pending exists but has no paypal_order_id, create order on PayPal and update that row.
   * - Otherwise create a new PayPal order and insert a new payment row.
   */
  public async createOrder(userId: number, plan: string, billingPeriod?: string): Promise<{ payment: Payment; orderID: string }> {
    const uid = this.ensureValidUserId(userId);
    const price = this.mapPlanPrice(plan, billingPeriod);
    if (!price || Number(price.amount) <= 0) throw new BadRequestException("Invalid or free plan selected");

    // statuses considered "pending"
    const pendingStatuses = ["pending", "created", "pending_capture", "authorized"];

    // Try to find existing pending row for same user + plan + billing_period
    try {
      const existing = await this.paymentRepo.findOne({
        where: { user_id: uid, plan: plan, billingPeriod: billingPeriod ?? null, status: In(pendingStatuses) } as any,
        order: { createdAt: "DESC" },
      });

      // If existing pending row exists and already has a PayPal order id, reuse it
      if (existing) {
        if (existing.paypalOrderId) {
          return { payment: existing, orderID: existing.paypalOrderId };
        }

        // existing row present but no paypalOrderId: create an order then update the same row
        const purchaseUnits = [
          {
            amount: { currency_code: price.currency, value: String(price.amount) },
            description: `BrainiHi subscription — ${plan} (${billingPeriod ?? "one-off"})`,
          },
        ];
        const order = await createOrderOnPayPal(purchaseUnits, "CAPTURE");
        const orderID = order?.id ?? null;
        if (!orderID) {
          this.logger.error("PayPal order creation failed (reusing existing row)", order);
          throw new Error("PayPal order creation failed");
        }
        existing.paypalOrderId = orderID;
        existing.raw = JSON.stringify(order);
        existing.amount = Number(price.amount);
        existing.currency = price.currency;
        existing.updatedAt = new Date();
        const saved = await this.paymentRepo.save(existing);
        return { payment: saved, orderID };
      }
    } catch (err) {
      this.logger.warn("createOrder: lookup for existing pending row failed, proceeding to create new. Err: " + (err as any));
    }

    // No existing pending row: create PayPal order then insert a new payments row
    const purchaseUnits = [
      {
        amount: { currency_code: price.currency, value: String(price.amount) },
        description: `BrainiHi subscription — ${plan} (${billingPeriod ?? "one-off"})`,
      },
    ];

    const order = await createOrderOnPayPal(purchaseUnits, "CAPTURE");
    const orderID = order?.id ?? null;
    if (!orderID) {
      this.logger.error("PayPal order creation failed", order);
      throw new Error("PayPal order creation failed");
    }

    // Derive reason/change_to: if user's current profile plan differs we mark change_plan
    let reason: string | null = "regular";
    let change_to: string | null = null;
    try {
      const userRepo = this.dataSource.getRepository(User);
      const user = await userRepo.findOne({ where: { id: uid } } as any);
      const currentPlan = user?.plan ?? null;
      if (currentPlan && String(currentPlan).toLowerCase() !== String(plan).toLowerCase()) {
        reason = "change_plan";
        change_to = plan;
      }
    } catch (err) {
      this.logger.debug("createOrder: unable to fetch user for reason detection", err as any);
    }

    const insertObj: any = {
      user_id: uid,
      plan,
      billing_period: billingPeriod ?? null,
      amount: Number(price.amount),
      currency: price.currency,
      paypal_order_id: orderID,
      status: "pending",
      raw: JSON.stringify(order),
      // store our derived metadata in existing payments table fields (nullable)
      // If your DB schema later adds explicit columns, prefer those.
      created_at: new Date(),
      updated_at: new Date(),
    };

    // Insert the new payments row
    const result = await this.dataSource
      .createQueryBuilder()
      .insert()
      .into("payments")
      .values(insertObj)
      .returning("*")
      .execute();

    const savedRaw = result?.raw && result.raw[0] ? result.raw[0] : null;
    const saved = (savedRaw as any) as Payment;

    // Persist reason/change_to as JSON in raw field if explicit columns not present
    try {
      // attach metadata into raw JSON to make it available to the frontend without DB migration
      const parsedRaw = saved.raw ? (typeof saved.raw === "string" ? JSON.parse(saved.raw) : saved.raw) : {};
      parsedRaw.__meta = parsedRaw.__meta || {};
      parsedRaw.__meta.reason = reason;
      parsedRaw.__meta.change_to = change_to;
      saved.raw = parsedRaw;
      await this.paymentRepo.save(saved);
    } catch (err) {
      // best-effort only
      this.logger.debug("createOrder: unable to attach reason/change_to into raw JSON", err as any);
    }

    return { payment: saved, orderID };
  }

  public async captureOrder(userId: number, orderID: string): Promise<Payment> {
    const uid = this.ensureValidUserId(userId);
    if (!orderID) throw new BadRequestException("Missing order id");

    const captureResult = await captureOrderOnPayPal(orderID);
    const purchaseUnit: any = (captureResult?.purchase_units && captureResult.purchase_units[0]) || null;
    const capturesArray: any[] | null = purchaseUnit?.payments?.captures ?? null;
    const capture: any = Array.isArray(capturesArray) && capturesArray.length > 0 ? capturesArray[0] : null;

    const captureId: string | null = capture?.id ?? null;
    const status: string = (capture?.status ?? captureResult?.status ?? "COMPLETED") as string;
    const amountVal: string | null = capture?.amount?.value ?? (purchaseUnit?.amount?.value ?? null);
    const currency: string = capture?.amount?.currency_code ?? (purchaseUnit?.amount?.currency_code ?? "USD");

    let payment = await this.paymentRepo.findOne({ where: { paypalOrderId: orderID } });

    if (!payment) {
      const insertObj: any = {
        user_id: uid,
        plan: "Pro",
        billing_period: null,
        amount: Number(amountVal ?? 0),
        currency,
        paypal_order_id: orderID,
        paypal_capture_id: captureId,
        status: (status ?? "completed").toLowerCase(),
        raw: JSON.stringify(captureResult),
        payer_email: captureResult?.payer?.email_address ?? null,
        payer_name:
          captureResult?.payer?.name?.given_name
            ? `${captureResult.payer.name.given_name} ${captureResult.payer.name.surname ?? ""}`
            : null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const result = await this.dataSource.createQueryBuilder().insert().into("payments").values(insertObj).returning("*").execute();
      payment = (result?.raw?.[0] ?? null) as Payment;
    } else {
      payment.paypalCaptureId = captureId ?? payment.paypalCaptureId;
      payment.status = (status ?? payment.status ?? "completed").toLowerCase();
      payment.amount = Number(amountVal ?? payment.amount);
      payment.currency = currency ?? payment.currency;
      payment.raw = JSON.stringify(captureResult);
      payment.payerEmail = captureResult?.payer?.email_address ?? payment.payerEmail;
      payment.payerName =
        captureResult?.payer?.name?.given_name ? `${captureResult.payer.name.given_name} ${captureResult.payer.name.surname ?? ""}` : payment.payerName;

      payment = await this.paymentRepo.save(payment);
    }

    try {
      const userRepo = this.dataSource.getRepository(User);
      const user = await userRepo.findOne({ where: { id: uid } } as any);
      if (user) {
        const planName = (payment as any).plan || user.plan || "Pro";
        const billing = (payment as any).billingPeriod || "monthly";
        user.plan = planName;
        const now = new Date();
        if (billing === "monthly") {
          now.setDate(now.getDate() + 30);
          user.plan_expiry = now;
        } else if (billing === "yearly") {
          now.setFullYear(now.getFullYear() + 1);
          user.plan_expiry = now;
        } else {
          user.plan_expiry = null;
        }
        await userRepo.save(user);
      }
    } catch (err) {
      this.logger.warn("Failed to update user plan after capture", err as any);
    }

    return payment as Payment;
  }

  public async listPaymentsForUser(userId: number): Promise<Payment[]> {
    const uid = this.ensureValidUserId(userId);
    return this.paymentRepo.find({ where: { user_id: uid }, order: { createdAt: "DESC" } });
  }

  /**
   * listInvoicesForUser: returns a curated invoice list for frontend:
   * - If there are any pending payments, return only the most recent pending invoice (as a single-element array),
   *   including a derived reason and change_to when possible.
   * - Otherwise return the most recent paid invoices (up to limit).
   *
   * This avoids flooding the frontend with duplicate pending rows created by retries.
   */
  public async listInvoicesForUserCurated(userId: number, paidLimit = 10): Promise<InvoiceDTO[]> {
    const uid = this.ensureValidUserId(userId);

    // get all recent payments for user (desc)
    const all = await this.paymentRepo.find({ where: { user_id: uid }, order: { createdAt: "DESC" } });

    // find most recent pending
    const pendingStatuses = ["pending", "created", "pending_capture", "authorized"];
    const mostRecentPending = all.find((p) => pendingStatuses.includes(String(p.status).toLowerCase()));

    // helper to build invoice DTO from payment row
    const buildInvoiceFromPayment = async (p: Payment): Promise<InvoiceDTO> => {
      const id = p.id;
      const date = p.createdAt;
      const amount = this.formatAmount(p.amount);
      const currency = p.currency ?? "USD";
      const status = p.status ?? "pending";
      let reason: InvoiceDTO["reason"] = "unknown";
      let change_to: string | null = null;

      // If the raw JSON contains __meta.reason / __meta.change_to (set by createOrder), respect it
      try {
        const raw = p.raw ? (typeof p.raw === "string" ? JSON.parse(p.raw) : p.raw) : {};
        if (raw && raw.__meta) {
          if (raw.__meta.reason) {
            const r = String(raw.__meta.reason).toLowerCase();
            if (r.includes("change")) reason = "change_plan";
            else if (r.includes("past")) reason = "past_due";
            else if (r.includes("next")) reason = "next_due";
            else reason = "regular";
          }
          if (raw.__meta.change_to) change_to = String(raw.__meta.change_to);
        }
      } catch {
        // ignore parse errors
      }

      // If no reason determined yet, derive it using user profile and payment row
      if (!reason || reason === "unknown") {
        try {
          const userRepo = this.dataSource.getRepository(User);
          const user = await userRepo.findOne({ where: { id: uid } } as any);
          const profilePlan = user?.plan ?? null;
          let activeSubscription = false;
          if (user?.plan_expiry) {
            const expiry = new Date(user.plan_expiry);
            activeSubscription = !isNaN(expiry.getTime()) && expiry.getTime() > Date.now();
          }
          if (String(p.plan ?? "").toLowerCase() !== String(profilePlan ?? "").toLowerCase() && profilePlan) {
            reason = "change_plan";
            change_to = String(p.plan ?? null);
          } else if (!activeSubscription && (String(profilePlan ?? "").toLowerCase() !== "free")) {
            reason = "past_due";
          } else {
            reason = "regular";
          }
        } catch {
          reason = "regular";
        }
      }

      return {
        id,
        date,
        amount,
        currency,
        status,
        receipt_url: `/receipt/${id}`,
        reason,
        change_to,
        plan: p.plan ?? null,
      };
    };

    if (mostRecentPending) {
      // Return single latest pending invoice only
      const invoice = await buildInvoiceFromPayment(mostRecentPending);
      return [invoice];
    }

    // Otherwise return most recent paid invoices up to the limit
    const paidStatuses = ["completed", "captured", "succeeded", "success", "paid"];
    const paidRows = all.filter((r) => paidStatuses.includes(String(r.status).toLowerCase())).slice(0, paidLimit);
    const invoices = await Promise.all(paidRows.map((r) => buildInvoiceFromPayment(r)));
    return invoices;
  }

  public async getPaymentForUser(userId: number, paymentId: number): Promise<Payment> {
    const uid = this.ensureValidUserId(userId);
    const p = await this.paymentRepo.findOne({ where: { id: paymentId } });
    if (!p) throw new NotFoundException("Payment not found");
    if (p.user_id !== uid) throw new NotFoundException("Payment not found for user");
    return p;
  }

  public async getPaymentMethodPreview(userId: number) {
    const uid = this.ensureValidUserId(userId);
    const p = await this.paymentRepo.findOne({ where: { user_id: uid }, order: { createdAt: "DESC" } });
    if (!p) return null;
    return {
      brand: "PayPal",
      last4: "",
      masked: p.payerEmail ?? "",
      exp_month: null,
      exp_year: null,
    };
  }

  /**
   * Backwards-compatible alias used by guards/older code.
   * Returns the same structured object as getAccessInfo(userId).
   */
  public async checkAccess(userId: number): Promise<AccessInfo> {
    if (!userId || Number.isNaN(Number(userId))) {
      return {
        allowed: false,
        activeSubscription: false,
        hasSuccessfulPayment: false,
        plan: null,
        plan_expiry: null,
        reason: "invalid_user",
      };
    }
    return this.getAccessInfo(userId);
  }

  public async getAccessInfo(userId: number): Promise<AccessInfo> {
    if (!userId) {
      return { allowed: false, activeSubscription: false, hasSuccessfulPayment: false, plan: null, plan_expiry: null, reason: "invalid_user" };
    }

    try {
      const userRepo = this.dataSource.getRepository(User);
      const user = await userRepo.findOne({ where: { id: userId } } as any);
      if (!user) {
        return { allowed: false, activeSubscription: false, hasSuccessfulPayment: false, plan: null, plan_expiry: null, reason: "user_not_found" };
      }

      const plan = user.plan ?? "Free";
      const plan_expiry = user.plan_expiry ? new Date(user.plan_expiry).toISOString() : null;
      let activeSubscription = false;
      if (user.plan_expiry) {
        const expiry = new Date(user.plan_expiry);
        if (!isNaN(expiry.getTime()) && expiry.getTime() > Date.now()) activeSubscription = true;
      }

      const allowedStatuses = ["completed", "captured", "succeeded", "success", "paid"];
      const found = await this.paymentRepo.findOne({
        where: { user_id: userId, status: In(allowedStatuses) } as any,
        order: { createdAt: "DESC" },
      });

      const hasSuccessfulPayment = !!found;
      const allowed = String(plan).toLowerCase() === "free" ? true : (activeSubscription || hasSuccessfulPayment);

      const pendingStatuses = ["pending", "created", "pending_capture", "authorized"];
      const pending = await this.paymentRepo.findOne({
        where: { user_id: userId, status: In(pendingStatuses) } as any,
        order: { createdAt: "DESC" },
      });

      let pendingAmount: string | null = null;
      if (pending) {
        try {
          const amt = pending.amount ?? 0;
          const amtNum = Number(amt);
          const amtStr = Number.isFinite(amtNum) ? amtNum.toFixed(2) : String(amt);
          const cur = pending.currency ?? "USD";
          pendingAmount = `${amtStr} ${String(cur).toUpperCase()}`;
        } catch {
          pendingAmount = null;
        }
      }

      return { allowed, activeSubscription, hasSuccessfulPayment, plan: String(plan), plan_expiry, reason: null, pendingAmount };
    } catch (err) {
      this.logger.warn("getAccessInfo failed", err as any);
      return { allowed: false, activeSubscription: false, hasSuccessfulPayment: false, plan: null, plan_expiry: null, reason: "internal_error" };
    }
  }

  // Webhook reconciliation (kept as existing)
  public async handleWebhook(event: any) {
    try {
      const eventType = event?.event_type ?? event?.type ?? null;
      if (!eventType) return;

      if (["CHECKOUT.ORDER.APPROVED", "PAYMENT.CAPTURE.COMPLETED", "PAYMENT.CAPTURE.DENIED", "PAYMENT.CAPTURE.PENDING"].includes(eventType)) {
        const resource = event.resource ?? {};
        const orderId = resource?.supplementary_data?.related_ids?.order_id ?? resource?.order_id ?? resource?.id ?? null;

        if (!orderId && resource?.id) {
          const captureId = resource.id;
          const payment = await this.paymentRepo.findOne({ where: { paypalCaptureId: captureId } });
          if (payment) {
            payment.status = (resource?.status ?? payment.status ?? "completed").toLowerCase();
            payment.raw = JSON.stringify(event);
            await this.paymentRepo.save(payment);
          }
          return;
        }

        if (orderId) {
          const order = await getOrderOnPayPal(orderId);
          const pu = (order.purchase_units && order.purchase_units[0]) || null;
          const captures = pu?.payments?.captures ?? null;
          const cap = Array.isArray(captures) && captures.length > 0 ? captures[0] : null;

          const payment = await this.paymentRepo.findOne({ where: { paypalOrderId: orderId } });
          if (payment) {
            payment.paypalCaptureId = cap?.id ?? payment.paypalCaptureId;
            payment.status = (cap?.status ?? order.status ?? payment.status ?? "completed").toLowerCase();
            payment.payerEmail = order?.payer?.email_address ?? payment.payerEmail;
            payment.payerName = order?.payer?.name?.given_name ? `${order.payer.name.given_name} ${order.payer.name.surname ?? ""}` : payment.payerName;
            payment.raw = JSON.stringify(order || event);
            await this.paymentRepo.save(payment);
          } else {
            const amount = pu?.amount?.value ?? null;
            const currency = pu?.amount?.currency_code ?? "USD";
            const insertObj: any = {
              paypal_order_id: orderId,
              paypal_capture_id: cap?.id ?? null,
              amount: Number(amount ?? 0),
              currency,
              status: (cap?.status ?? order.status ?? "completed").toLowerCase(),
              payer_email: order?.payer?.email_address ?? null,
              payer_name: order?.payer?.name?.given_name ? `${order.payer.name.given_name} ${order.payer.name.surname ?? ""}` : null,
              raw: JSON.stringify(order || event),
              created_at: new Date(),
              updated_at: new Date(),
            };
            await this.dataSource.createQueryBuilder().insert().into("payments").values(insertObj).execute();
          }
        }
      }
    } catch (err) {
      this.logger.warn("Webhook reconciliation failed", err as any);
    }
  }
}