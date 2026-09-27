import { getLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { listAllProductsForAdmin } from '@/lib/db/repos/products';
import { allCollectionsForAdmin } from '@/lib/db/repos/collections';
import { listOrdersForAdmin, orderStatusCounts } from '@/lib/db/repos/orders';
import { getTelegramState } from '@/lib/server/telegram';
import {
  allPoliciesForAdmin,
  getAboutPage,
  visibleHomeSections
} from '@/lib/db/repos/content';
import { getSettings } from '@/lib/db/repos/settings';
import { formatPrice } from '@/lib/format';
import OrderStatusBadge from '@/components/admin/OrderStatusBadge';
import { TelegramIcon } from '@/components/ui/Icons';
import type { Locale } from '@/i18n/routing';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations('admin.dashboard');
  const tOrders = await getTranslations('admin.orders');

  const products = listAllProductsForAdmin();
  const collections = allCollectionsForAdmin();
  const orderCounts = orderStatusCounts();
  const telegram = getTelegramState();
  const recentOrders = listOrdersForAdmin(5);
  const settings = getSettings();
  const about = getAboutPage();
  const policies = allPoliciesForAdmin();

  const stats = [
    {
      label: t('products'),
      value: products.length,
      sub: t('activeProducts', {
        count: products.filter((p) => p.status === 'active').length
      })
    },
    { label: t('collections'), value: collections.length, sub: '' },
    { label: t('orders'), value: orderCounts.total, sub: '' },
    { label: t('pendingOrders'), value: orderCounts.pending, sub: '' },
    { label: t('deliveredOrders'), value: orderCounts.delivered, sub: '' },
    { label: t('failedOrders'), value: orderCounts.failed, sub: '' }
  ];

  const setupSteps = [
    {
      done:
        !!settings.branding.logoMediaId ||
        settings.branding.storeNameEn !== 'MAISON',
      title: t('identityTitle'),
      description: t('identityDescription'),
      href: '/admin/branding'
    },
    {
      done: products.some((product) => product.status === 'active'),
      title: t('catalogTitle'),
      description: t('catalogDescription'),
      href: '/admin/products'
    },
    {
      done: collections.some((collection) => collection.is_visible === 1),
      title: t('collectionsTitle'),
      description: t('collectionsDescription'),
      href: '/admin/collections'
    },
    {
      done: visibleHomeSections().length > 0,
      title: t('homepageTitle'),
      description: t('homepageDescription'),
      href: '/admin/home-sections'
    },
    {
      done: !!about.body_en.trim() && !!about.body_ar.trim(),
      title: t('storyTitle'),
      description: t('storyDescription'),
      href: '/admin/about'
    },
    {
      done:
        policies.length === 4 &&
        policies.every(
          (policy) =>
            policy.is_visible === 1 &&
            !!policy.body_en.trim() &&
            !!policy.body_ar.trim()
        ),
      title: t('policiesTitle'),
      description: t('policiesDescription'),
      href: '/admin/policies'
    },
    {
      done: telegram.isConfigured,
      title: t('ordersTitle'),
      description: t('ordersDescription'),
      href: '/admin/telegram'
    }
  ];
  const completedSteps = setupSteps.filter((step) => step.done).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="display-heading text-3xl">{t('title')}</h1>
        <Link href="/" target="_blank" className="admin-btn-secondary">
          {t('previewStore')}
        </Link>
      </div>

      <section
        className="admin-card admin-journey p-5 md:p-7"
        aria-labelledby="store-setup-title"
      >
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <p className="eyebrow">{t('setupEyebrow')}</p>
            <h2
              id="store-setup-title"
              className="display-heading text-2xl md:text-3xl mt-2"
            >
              {t('setupSteps')}
            </h2>
            <p className="text-sm text-stone-deep mt-2 leading-relaxed">
              {t('setupIntro')}
            </p>
          </div>
          <p
            className="text-sm text-stone-deep tabular-nums"
            aria-live="polite"
          >
            {t('setupProgress', {
              count: completedSteps,
              total: setupSteps.length
            })}
          </p>
        </div>
        <div
          className="admin-journey-progress mt-5"
          role="progressbar"
          aria-label={t('setupSteps')}
          aria-valuemin={0}
          aria-valuemax={setupSteps.length}
          aria-valuenow={completedSteps}
        >
          <span
            style={{ width: `${(completedSteps / setupSteps.length) * 100}%` }}
          />
        </div>
        <ol className="grid md:grid-cols-2 xl:grid-cols-4 gap-3 mt-6">
          {setupSteps.map((step, index) => (
            <li key={step.href}>
              <Link
                href={step.href}
                className="admin-journey-step group block h-full p-4"
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="text-xs text-stone tabular-nums" dir="ltr">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span
                    className={`text-xs ${step.done ? 'text-[#2f6b4f]' : 'text-stone-deep'}`}
                  >
                    {step.done ? t('setupDone') : t('setupToDo')}
                  </span>
                </span>
                <strong className="block mt-5 text-sm font-medium text-ink group-hover:text-accent">
                  {step.title}
                </strong>
                <span className="block mt-2 text-xs leading-relaxed text-stone-deep">
                  {step.description}
                </span>
                <span className="block mt-4 text-xs font-medium text-ink underline underline-offset-4">
                  {step.done ? t('setupReview') : t('setupOpen')}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      {/* Telegram status banner */}
      <div
        className={`admin-card p-4 flex flex-wrap items-center justify-between gap-3 ${
          telegram.isConfigured ? '' : 'border-[#e0c9a8]'
        }`}
      >
        <div className="flex items-center gap-3">
          <TelegramIcon
            size={20}
            className={telegram.isConfigured ? 'text-[#2f6b4f]' : 'text-stone'}
          />
          <div>
            <p className="text-sm font-medium">{t('telegramStatus')}</p>
            <p
              className={`text-xs ${telegram.isConfigured ? 'text-[#2f6b4f]' : 'text-[#8c6a2f]'}`}
            >
              {telegram.isConfigured
                ? t('telegramConfigured')
                : t('telegramNotConfigured')}
            </p>
          </div>
        </div>
        {!telegram.isConfigured ? (
          <Link href="/admin/telegram" className="admin-btn">
            {t('telegramCta')}
          </Link>
        ) : null}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="admin-card p-4">
            <p className="text-xs text-stone">{s.label}</p>
            <p className="mt-1 text-2xl font-medium tabular-nums" dir="ltr">
              {s.value}
            </p>
            {s.sub ? (
              <p className="mt-0.5 text-xs text-stone">{s.sub}</p>
            ) : null}
          </div>
        ))}
      </div>

      {/* Recent orders */}
      <div className="admin-card">
        <div className="flex items-center justify-between p-5 pb-3">
          <h2 className="text-sm font-medium">{t('recentOrders')}</h2>
          <Link
            href="/admin/orders"
            className="text-xs text-stone-deep hover:text-ink underline underline-offset-4"
          >
            {tOrders('title')}
          </Link>
        </div>
        {recentOrders.length === 0 ? (
          <p className="p-5 pt-0 text-sm text-stone">{t('noOrders')}</p>
        ) : (
          <ul className="divide-y divide-line">
            {recentOrders.map((order) => (
              <li
                key={order.id}
                className="flex flex-wrap items-center justify-between gap-2 px-5 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium tabular-nums" dir="ltr">
                    #{order.order_number}
                  </span>
                  <span className="text-sm text-stone-deep">
                    {order.customer_name}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm tabular-nums" dir="ltr">
                    {formatPrice(
                      order.total,
                      locale,
                      settings.locale.currencySymbolEn,
                      settings.locale.currencySymbolAr
                    )}
                  </span>
                  <OrderStatusBadge status={order.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
