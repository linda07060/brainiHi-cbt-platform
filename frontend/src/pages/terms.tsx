import Head from "next/head";
import Header from "../components/Header";
import layout from "../styles/Layout.module.css";
import styles from "../styles/Terms.module.css";

/**
 * Payment Terms page (bilingual)
 * - English version first, then updated Russian version below (as requested)
 * - Each language section uses an appropriate lang attribute for accessibility and SEO
 */
export default function TermsPage(): JSX.Element {
  return (
    <>
      <Head>
        <title>Payment Terms — BrainiHi / Условия оплаты — BrainiHi</title>
        <meta
          name="description"
          content="Payment Terms for BrainiHi (English and Russian): payment provider, supported methods, subscriptions and recurring payments."
        />
      </Head>

      <Header />

      <main
        className={`${layout.container} ${styles.termsMain}`}
        style={{ padding: "40px 0" }}
        aria-labelledby="payment-terms-heading"
      >
        <article className={styles.articleWrapper}>
          {/* ENGLISH */}
          <section id="payment-terms-en" lang="en" aria-labelledby="payment-terms-heading-en">
            <h1 id="payment-terms-heading-en">PAYMENT TERMS</h1>

            <p><strong>Effective date:</strong> December 19, 2025</p>

            <p><strong>Website:</strong> <a href="https://brainihi.com">https://brainihi.com</a></p>

            <p><strong>Website support:</strong> <a href="mailto:support@brainihi.com">support@brainihi.com</a></p>

            <p><strong>Payment provider:</strong> TipTop Pay (CloudPayments)</p>
            <p><strong>Payment support:</strong> <a href="mailto:support@cloudpayments.kz">support@cloudpayments.kz</a></p>

            <h2>1. General Provisions</h2>
            <ol>
              <li>
                <p>These Payment Terms govern the payment procedures for services provided through brainihi.com (the “Website”, the “Service”).</p>
              </li>
              <li>
                <p>By making a payment on the Website, the User confirms that they have read and fully accepted these Payment Terms, as well as the Terms of Service and Privacy Policy.</p>
              </li>
              <li>
                <p>If the User does not agree with these Payment Terms, they must refrain from using paid features of the Service.</p>
              </li>
            </ol>

            <h2>2. Payment Provider</h2>
            <ol>
              <li>
                <p>All payments on the Website are processed via the certified payment provider TipTop Pay (CloudPayments).</p>
              </li>
              <li>
                <p>brainihi.com does not collect, process, or store Users’ bank card details.</p>
              </li>
              <li>
                <p>Payment processing complies with PCI DSS security standards and applicable payment system rules.</p>
              </li>
            </ol>

            <h2>3. Payment Methods</h2>
            <ol>
              <li>
                <p>Payments may be made using:</p>
                <ul>
                  <li>bank cards (Visa, Mastercard, and other methods supported by the payment provider);</li>
                  <li>other payment methods available through TipTop Pay at checkout.</li>
                </ul>
              </li>
              <li>
                <p>Available payment methods are displayed to the User before completing the payment.</p>
              </li>
            </ol>

            <h2>4. Pricing and Currency</h2>
            <ol>
              <li>
                <p>Service prices are displayed on the Website prior to payment.</p>
              </li>
              <li>
                <p>Payments are charged in the currency indicated on the checkout page.</p>
              </li>
              <li>
                <p>Applicable taxes (including VAT / GST) may be included depending on the User’s location and legal requirements.</p>
              </li>
            </ol>

            <h2>5. Charge Timing</h2>
            <ol>
              <li>
                <p>The User’s payment method is charged immediately after payment confirmation.</p>
              </li>
              <li>
                <p>A successful charge constitutes confirmation of the service agreement between the User and the Service.</p>
              </li>
              <li>
                <p>A small temporary authorization charge may be applied to verify the payment method and will be automatically released by the payment provider.</p>
              </li>
            </ol>

            <h2>6. Subscriptions and Recurring Payments</h2>
            <ol>
              <li>
                <p>Certain services are offered on a subscription basis with recurring charges.</p>
              </li>
              <li>
                <p>By subscribing, the User authorizes the Service to automatically charge the selected payment method according to the chosen plan.</p>
              </li>
              <li>
                <p>Subscriptions may be canceled at any time via the user account or by contacting website support.</p>
              </li>
              <li>
                <p>Cancellation stops future charges but does not automatically entitle the User to a refund of already processed payments unless stated otherwise in the Refund Policy or required by applicable law.</p>
              </li>
            </ol>
          </section>

          <hr style={{ margin: "28px 0", border: "none", borderTop: "1px solid rgba(0,0,0,0.06)" }} />

          {/* RUSSIAN (updated per provided content) */}
          <section id="payment-terms-ru" lang="ru" aria-labelledby="payment-terms-heading-ru">
            <h1 id="payment-terms-heading-ru">УСЛОВИЯ ОПЛАТЫ</h1>

            <p><strong>Дата вступления в силу:</strong> 19 декабря 2025 года</p>

            <p><strong>Сайт:</strong> <a href="https://brainihi.com">https://brainihi.com</a></p>

            <p><strong>Поддержка сайта:</strong> <a href="mailto:support@brainihi.com">support@brainihi.com</a></p>

            <p><strong>Платёжный провайдер:</strong> TipTop Pay (CloudPayments)</p>
            <p><strong>Поддержка платежей:</strong> <a href="mailto:support@cloudpayments.kz">support@cloudpayments.kz</a></p>

            <h2>1. Общие положения</h2>
            <p><strong>1.1.</strong> Настоящие Условия оплаты (далее — «Условия») регулируют порядок оплаты услуг, предоставляемых через сайт brainihi.com (далее — «Сайт», «Сервис»).</p>
            <p><strong>1.2.</strong> Совершая оплату на Сайте, Пользователь подтверждает, что он полностью ознакомился и безоговорочно принимает настоящие Условия оплаты, а также Условия использования и Политику конфиденциальности.</p>
            <p><strong>1.3.</strong> Если Пользователь не согласен с настоящими Условиями, он обязан воздержаться от использования платных функций Сервиса.</p>

            <h2>2. Платёжный провайдер</h2>
            <p><strong>2.1.</strong> Все платежи на Сайте обрабатываются через сертифицированного платёжного провайдера TipTop Pay (CloudPayments).</p>
            <p><strong>2.2.</strong> Сайт brainihi.com не обрабатывает и не хранит данные банковских карт Пользователей.</p>
            <p><strong>2.3.</strong> Обработка платежей осуществляется в соответствии со стандартами безопасности PCI DSS и правилами платёжных систем.</p>

            <h2>3. Способы оплаты</h2>
            <p><strong>3.1.</strong> Оплата услуг осуществляется следующими способами:</p>
            <ul>
              <li>банковскими картами (Visa, Mastercard и другими методами, поддерживаемыми платёжным провайдером);</li>
              <li>иными способами, доступными через платёжный интерфейс TipTop Pay.</li>
            </ul>
            <p><strong>3.2.</strong> Все доступные способы оплаты отображаются Пользователю в момент оформления платежа.</p>

            <h2>4. Стоимость услуг и валюта</h2>
            <p><strong>4.1.</strong> Стоимость услуг указывается на Сайте до момента совершения оплаты.</p>
            <p><strong>4.2.</strong> Оплата производится в валюте, указанной на странице оплаты.</p>
            <p><strong>4.3.</strong> В зависимости от страны Пользователя в стоимость могут быть включены применимые налоги (включая НДС / GST), если это предусмотрено законодательством.</p>

            <h2>5. Момент списания средств</h2>
            <p><strong>5.1.</strong> Денежные средства списываются с выбранного пользователем способа оплаты непосредственно после подтверждения оплаты.</p>
            <p><strong>5.2.</strong> Факт успешного списания средств является подтверждением заключения договора об оказании услуг между Пользователем и Сервисом.</p>
            <p><strong>5.3.</strong> В целях проверки платёжного средства может применяться временная предварительная авторизация (блокировка небольшой суммы), которая автоматически снимается платёжным провайдером.</p>

            <h2>6. Подписки и регулярные платежи</h2>
            <p><strong>6.1.</strong> Некоторые услуги Сайта предоставляются по модели подписки с регулярным списанием средств.</p>
            <p><strong>6.2.</strong> Оформляя подписку, Пользователь даёт согласие на автоматическое периодическое списание средств в соответствии с выбранным тарифом.</p>
            <p><strong>6.3.</strong> Подписку можно отменить в любое время в личном кабинете или путем обращения в службу поддержки сайта.</p>
            <p><strong>6.4.</strong> Отмена подписки прекращает будущие списания, но не является основанием для автоматического возврата уже списанных средств, если иное не указано в Политике возврата или не предусмотрено применимым законодательством.</p>

            <h2>7. Возвраты и отмена платежей</h2>
            <p><strong>7.1.</strong> Возврат средств осуществляется в соответствии с Политикой возврата и отмены, размещённой на Сайте.</p>
            <p><strong>7.2.</strong> Возвраты производятся тем же способом оплаты, которым был совершен платеж, если иное не согласовано сторонами.</p>
            <p><strong>7.3.</strong> Срок зачисления средств зависит от банка Пользователя и платёжной системы и может составлять от 3 до 10 рабочих дней.</p>

            <h2>8. Ответственность сторон</h2>
            <p><strong>8.1.</strong> Сервис не несёт ответственности за:</p>
            <ul>
              <li>отказы в проведении платежей по причинам, не зависящим от Сервиса;</li>
              <li>действия банков, платёжных систем и платёжного провайдера.</li>
            </ul>
            <p><strong>8.2.</strong> Пользователь несёт ответственность за корректность введённых платёжных данных.</p>

            <h2>9. Изменение условий оплаты</h2>
            <p><strong>9.1.</strong> Администрация Сайта вправе вносить изменения в настоящие Условия в любое время.</p>
            <p><strong>9.2.</strong> Новая редакция Условий вступает в силу с момента её публикации на Сайте.</p>

            <h2>10. Контактная информация</h2>
            <p>По вопросам, связанным с оплатой услуг:</p>
            <ul>
              <li>Поддержка сайта: <a href="mailto:support@brainihi.com">support@brainihi.com</a></li>
              <li>Поддержка платёжного провайдера: <a href="mailto:support@cloudpayments.kz">support@cloudpayments.kz</a></li>
            </ul>
          </section>
        </article>
      </main>
    </>
  );
}