import React, { useEffect, useState } from 'react';
import { Bike, Calculator, Loader2, Search } from 'lucide-react';
import { apiService } from '../../services/api';
import {
  Card,
  CourierConnectCard,
  CourierModal,
  CourierOrderList,
  CourierPageHeader,
  DetailGrid,
  Field,
  Notice,
  PrimaryButton,
  SecondaryButton,
  SelectInput,
  TextArea,
  TextInput,
} from './CourierShared';

const CONNECT_FIELDS = [
  { name: 'client_id', label: 'Client ID', placeholder: 'Pathao client ID' },
  { name: 'client_secret', label: 'Client secret', type: 'password', autoComplete: 'new-password', placeholder: 'Pathao client secret', secret: true },
  { name: 'username', label: 'Login email', type: 'email', autoComplete: 'username', placeholder: 'you@business.com', hint: 'The email you use to sign in to Pathao Merchant.' },
  { name: 'password', label: 'Password', type: 'password', autoComplete: 'current-password', placeholder: 'Pathao login password', secret: true },
];

const DELIVERY_TYPES = [
  { value: 48, label: 'Normal delivery' },
  { value: 12, label: 'On demand' },
];
const ITEM_TYPES = [
  { value: 2, label: 'Parcel' },
  { value: 1, label: 'Document' },
];

const listFrom = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  return [];
};
const optionalString = (value) => (value && String(value).trim()) || null;
const optionalInt = (value) => (value === '' || value === null || value === undefined ? null : Number.parseInt(value, 10));
const formatTaka = (value) => (value === null || value === undefined ? null : `৳${Number(value).toLocaleString()}`);

const TrackConsignmentCard = () => {
  const [consignmentId, setConsignmentId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const id = consignmentId.trim();
    if (!id) return;
    setLoading(true);
    setError('');
    setInfo(null);
    try {
      const response = await apiService.getPathaoOrderInfo(id);
      if (!response?.data) throw new Error(response?.message || 'No order found for this consignment ID.');
      setInfo(response.data);
    } catch (err) {
      setError(err.message || 'Could not fetch the order status.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card icon={Search} title="Track a consignment" description="Check the latest Pathao status for any consignment ID.">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <Field label="Consignment ID" className="flex-1">
          <TextInput value={consignmentId} onChange={event => setConsignmentId(event.target.value)} placeholder="e.g. DL121224VS8TTJ" required />
        </Field>
        <PrimaryButton type="submit" loading={loading}>{loading ? 'Checking...' : 'Check status'}</PrimaryButton>
      </form>
      {error && <div className="mt-4"><Notice>{error}</Notice></div>}
      {info && (
        <div className="mt-4">
          <PathaoInfoGrid info={info} />
        </div>
      )}
    </Card>
  );
};

const PathaoInfoGrid = ({ info }) => (
  <DetailGrid items={[
    ['Consignment ID', info.consignment_id],
    ['Order status', info.order_status],
    ['Merchant order ID', info.merchant_order_id],
    ['Payment status', info.payment_status],
    ['Invoice ID', info.invoice_id],
    ['Last updated', info.updated_at ? new Date(info.updated_at).toLocaleString() : null],
  ]} />
);

const PathaoShipModal = ({ order, onClose }) => {
  const [form, setForm] = useState(null);
  const [stores, setStores] = useState([]);
  const [cities, setCities] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [setupWarning, setSetupWarning] = useState('');

  const [quote, setQuote] = useState(null);
  const [quoteKey, setQuoteKey] = useState('');
  const [quoting, setQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState('');

  const [placing, setPlacing] = useState(false);
  const [placeError, setPlaceError] = useState('');
  const [placement, setPlacement] = useState(null);
  const [statusInfo, setStatusInfo] = useState(null);
  const [checkingStatus, setCheckingStatus] = useState(false);

  // The modal is keyed by order id, so this runs once per order.
  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([
      apiService.getPathaoOrderPrefill(order.id),
      apiService.getPathaoStores(),
      apiService.getPathaoLocations(),
    ]).then(([prefillResult, storesResult, locationsResult]) => {
      if (cancelled) return;
      if (prefillResult.status === 'rejected') {
        setLoadError(prefillResult.reason?.message || 'Could not load the Pathao order prefill.');
        return;
      }
      const storeList = storesResult.status === 'fulfilled' ? listFrom(storesResult.value) : [];
      const defaultStore = storeList.find(store => store.is_default_store) || storeList.find(store => store.is_active !== 0) || storeList[0];
      const rawPrefill = prefillResult.value;
      const prefill = rawPrefill?.invoice !== undefined ? rawPrefill : (rawPrefill?.data || rawPrefill);

      setStores(storeList);
      setCities(locationsResult.status === 'fulfilled' ? listFrom(locationsResult.value) : []);
      if (storesResult.status === 'rejected' || locationsResult.status === 'rejected') {
        setSetupWarning('Could not load your Pathao stores or delivery locations. Make sure your Pathao account is connected.');
      }
      const rawTotal = order.total !== undefined && order.total !== null ? Number(String(order.total).trim()) : null;
      const fallbackAmount = Number.isFinite(rawTotal) && rawTotal >= 0 && rawTotal < 1e9 ? rawTotal : 0;
      setForm({
        store_id: defaultStore?.store_id ?? '',
        recipient_name: prefill?.recipient_name || order.contact_name || '',
        recipient_phone: prefill?.recipient_phone || order.contact_phone || '',
        recipient_secondary_phone: '',
        recipient_address: prefill?.recipient_address || order.delivery_address || '',
        recipient_city: '',
        recipient_zone: '',
        recipient_area: '',
        delivery_type: prefill?.delivery_type ?? 48,
        item_type: prefill?.item_type ?? 2,
        item_quantity: prefill?.item_quantity ?? 1,
        item_weight: prefill?.item_weight ?? 0.5,
        amount_to_collect: prefill?.amount_to_collect !== undefined && prefill?.amount_to_collect !== null
          ? prefill.amount_to_collect
          : fallbackAmount,
        merchant_order_id: prefill?.invoice ?? '',
        item_description: prefill?.item_description ?? '',
        special_instruction: prefill?.special_instruction ?? '',
      });
    });
    return () => { cancelled = true; };
  }, [order.id]);

  const locked = placing || Boolean(placement);
  const setField = (field) => (event) => {
    const { value } = event.target;
    setForm(current => {
      const next = { ...current, [field]: value };
      // Changing a parent location clears the dependent selections.
      if (field === 'recipient_city') { next.recipient_zone = ''; next.recipient_area = ''; }
      if (field === 'recipient_zone') { next.recipient_area = ''; }
      return next;
    });
  };

  const selectedCity = cities.find(city => String(city.city_id) === String(form?.recipient_city));
  const zones = selectedCity?.zones || [];
  const selectedZone = zones.find(zone => String(zone.zone_id) === String(form?.recipient_zone));
  const areas = selectedZone?.areas || [];

  const priceInputs = form ? {
    store_id: optionalInt(form.store_id),
    item_type: optionalInt(form.item_type),
    delivery_type: optionalInt(form.delivery_type),
    item_weight: Number(form.item_weight),
    recipient_city: optionalInt(form.recipient_city),
    recipient_zone: optionalInt(form.recipient_zone),
  } : null;
  const currentQuoteKey = JSON.stringify(priceInputs);
  const canQuote = Boolean(priceInputs?.store_id && priceInputs.recipient_city && priceInputs.recipient_zone && priceInputs.item_weight);
  // A quote only applies to the inputs it was calculated for.
  const visibleQuote = quote && quoteKey === currentQuoteKey ? quote : null;

  const handleQuote = async () => {
    if (!canQuote) return;
    setQuoting(true);
    setQuoteError('');
    try {
      const response = await apiService.calculatePathaoPrice(priceInputs);
      setQuote(response?.final_price === undefined && response?.data ? response.data : response);
      setQuoteKey(currentQuoteKey);
    } catch (err) {
      setQuoteError(err.message || 'Could not calculate the delivery price.');
    } finally {
      setQuoting(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form || placement) return;
    const confirmed = window.confirm(
      `Place order ${form.merchant_order_id || order.id} with Pathao Courier? This will create a real consignment.`
    );
    if (!confirmed) return;

    setPlacing(true);
    setPlaceError('');
    try {
      const response = await apiService.placePathaoOrder(order.id, {
        store_id: optionalInt(form.store_id),
        recipient_name: form.recipient_name.trim(),
        recipient_phone: form.recipient_phone.trim(),
        recipient_secondary_phone: optionalString(form.recipient_secondary_phone),
        recipient_address: form.recipient_address.trim(),
        recipient_city: optionalInt(form.recipient_city),
        recipient_zone: optionalInt(form.recipient_zone),
        recipient_area: optionalInt(form.recipient_area),
        delivery_type: optionalInt(form.delivery_type) ?? 48,
        item_type: optionalInt(form.item_type) ?? 2,
        item_quantity: optionalInt(form.item_quantity) ?? 1,
        item_weight: Number(form.item_weight) || 0.5,
        amount_to_collect: Math.max(0, Math.round(Number(form.amount_to_collect) || 0)),
        merchant_order_id: optionalString(form.merchant_order_id),
        item_description: optionalString(form.item_description),
        special_instruction: optionalString(form.special_instruction),
      });
      if (response?.type && response.type !== 'success' && !response?.data) {
        throw new Error(response.message || 'Pathao did not accept this order.');
      }
      setPlacement(response);
    } catch (err) {
      setPlaceError(err.message || 'Could not place the order with Pathao Courier.');
    } finally {
      setPlacing(false);
    }
  };

  const consignmentId = placement?.data?.consignment_id;
  const handleCheckStatus = async () => {
    if (!consignmentId) return;
    setCheckingStatus(true);
    try {
      const response = await apiService.getPathaoOrderInfo(consignmentId);
      setStatusInfo(response?.data || null);
    } catch (err) {
      setPlaceError(err.message || 'Could not fetch the order status.');
    } finally {
      setCheckingStatus(false);
    }
  };

  return (
    <CourierModal
      title="Ship with Pathao"
      subtitle={`${order.contact_name || 'Customer order'} · ${form?.merchant_order_id || order.id}`}
      onClose={onClose}
      footer={placement ? (
        <PrimaryButton type="button" onClick={onClose}>Done</PrimaryButton>
      ) : (
        <PrimaryButton type="submit" form="pathao-ship-form" loading={placing} disabled={!form}>
          {placing ? 'Placing order...' : 'Place order with Pathao'}
        </PrimaryButton>
      )}
    >
      {loadError ? (
        <Notice>{loadError}</Notice>
      ) : !form ? (
        <div className="flex h-48 flex-col items-center justify-center text-slate-400">
          <Loader2 className="mb-3 animate-spin" size={28} />
          <p>Preparing courier details...</p>
        </div>
      ) : (
        <form id="pathao-ship-form" onSubmit={handleSubmit} className="space-y-6">
          {setupWarning && <Notice>{setupWarning}</Notice>}

          <section className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Pickup</h4>
            <Field label="Pickup store" required>
              {stores.length > 0 ? (
                <SelectInput value={form.store_id} onChange={setField('store_id')} disabled={locked} required>
                  <option value="" disabled>Select a store</option>
                  {stores.map(store => (
                    <option key={store.store_id} value={store.store_id}>
                      {store.store_name || `Store ${store.store_id}`}{store.store_address ? ` — ${store.store_address}` : ''}
                    </option>
                  ))}
                </SelectInput>
              ) : (
                <TextInput type="number" min={1} value={form.store_id} onChange={setField('store_id')} disabled={locked} placeholder="Pathao store ID" required />
              )}
            </Field>
          </section>

          <section className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Recipient</h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Name" required>
                <TextInput value={form.recipient_name} onChange={setField('recipient_name')} minLength={3} maxLength={100} disabled={locked} required />
              </Field>
              <Field label="Phone" required hint="11 digits, e.g. 01XXXXXXXXX">
                <TextInput type="tel" value={form.recipient_phone} onChange={setField('recipient_phone')} pattern="\d{11}" minLength={11} maxLength={11} disabled={locked} required />
              </Field>
              <Field label="Secondary phone">
                <TextInput type="tel" value={form.recipient_secondary_phone} onChange={setField('recipient_secondary_phone')} pattern="\d{11}" maxLength={11} disabled={locked} />
              </Field>
              <Field label="Merchant order ID">
                <TextInput value={form.merchant_order_id} onChange={setField('merchant_order_id')} disabled={locked} />
              </Field>
              <Field label="Address" required className="sm:col-span-2">
                <TextArea value={form.recipient_address} onChange={setField('recipient_address')} minLength={10} maxLength={220} disabled={locked} required />
              </Field>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label="City">
                <SelectInput value={form.recipient_city} onChange={setField('recipient_city')} disabled={locked || cities.length === 0}>
                  <option value="">{cities.length ? 'Select city' : 'Unavailable'}</option>
                  {cities.map(city => <option key={city.city_id} value={city.city_id}>{city.city_name}</option>)}
                </SelectInput>
              </Field>
              <Field label="Zone">
                <SelectInput value={form.recipient_zone} onChange={setField('recipient_zone')} disabled={locked || zones.length === 0}>
                  <option value="">Select zone</option>
                  {zones.map(zone => <option key={zone.zone_id} value={zone.zone_id}>{zone.zone_name}</option>)}
                </SelectInput>
              </Field>
              <Field label="Area">
                <SelectInput value={form.recipient_area} onChange={setField('recipient_area')} disabled={locked || areas.length === 0}>
                  <option value="">Select area</option>
                  {areas.map(area => (
                    <option key={area.area_id} value={area.area_id}>
                      {area.area_name}{area.home_delivery_available === false ? ' (no home delivery)' : ''}
                    </option>
                  ))}
                </SelectInput>
              </Field>
            </div>
          </section>

          <section className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Parcel</h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Delivery type">
                <SelectInput value={form.delivery_type} onChange={setField('delivery_type')} disabled={locked}>
                  {DELIVERY_TYPES.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
                </SelectInput>
              </Field>
              <Field label="Item type">
                <SelectInput value={form.item_type} onChange={setField('item_type')} disabled={locked}>
                  {ITEM_TYPES.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
                </SelectInput>
              </Field>
              <Field label="Quantity">
                <TextInput type="number" min={1} step={1} value={form.item_quantity} onChange={setField('item_quantity')} disabled={locked} />
              </Field>
              <Field label="Weight (kg)" hint="Between 0.5 and 10 kg">
                <TextInput type="number" min={0.5} max={10} step={0.1} value={form.item_weight} onChange={setField('item_weight')} disabled={locked} />
              </Field>
              <Field label="Amount to collect" hint="Cash on delivery in taka. Use 0 if already paid.">
                <TextInput type="number" min={0} step={1} value={form.amount_to_collect} onChange={setField('amount_to_collect')} disabled={locked} />
              </Field>
              <Field label="Item description">
                <TextInput value={form.item_description} onChange={setField('item_description')} disabled={locked} />
              </Field>
              <Field label="Special instruction" className="sm:col-span-2">
                <TextArea value={form.special_instruction} onChange={setField('special_instruction')} disabled={locked} />
              </Field>
            </div>
          </section>

          {!placement && (
            <section className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h4 className="flex items-center gap-2 text-sm font-black text-slate-800">
                    <Calculator size={18} className="text-emerald-600" /> Delivery price
                  </h4>
                  <p className="mt-1 text-xs text-slate-500">
                    {canQuote ? 'Get a quote for the current store, location and weight.' : 'Select a store, city and zone to get a quote.'}
                  </p>
                </div>
                <SecondaryButton type="button" onClick={handleQuote} loading={quoting} disabled={!canQuote}>
                  {quoting ? 'Calculating...' : 'Calculate price'}
                </SecondaryButton>
              </div>
              {quoteError && <Notice>{quoteError}</Notice>}
              {visibleQuote && (
                <DetailGrid items={[
                  ['Final price', formatTaka(visibleQuote.final_price)],
                  ['Base price', formatTaka(visibleQuote.price)],
                  ['Discount', formatTaka((Number(visibleQuote.discount) || 0) + (Number(visibleQuote.promo_discount) || 0))],
                  ['COD charge', visibleQuote.cod_percentage != null ? `${Number(visibleQuote.cod_percentage) * 100}%` : null],
                ]} />
              )}
            </section>
          )}

          {placeError && <Notice>{placeError}</Notice>}

          {placement && (
            <div className="space-y-3">
              <Notice tone="success">{placement.message || 'Order placed successfully.'}</Notice>
              {placement.data && (
                <DetailGrid items={[
                  ['Consignment ID', placement.data.consignment_id],
                  ['Order status', placement.data.order_status],
                  ['Merchant order ID', placement.data.merchant_order_id],
                  ['Delivery fee', formatTaka(placement.data.delivery_fee)],
                ]} />
              )}
              {consignmentId && (
                <SecondaryButton type="button" onClick={handleCheckStatus} loading={checkingStatus}>
                  {checkingStatus ? 'Checking...' : 'Check latest status'}
                </SecondaryButton>
              )}
              {statusInfo && <PathaoInfoGrid info={statusInfo} />}
            </div>
          )}
        </form>
      )}
    </CourierModal>
  );
};

const PathaoCourier = ({ pages }) => {
  const [shippingOrder, setShippingOrder] = useState(null);

  return (
    <div className="relative flex h-full flex-1 flex-col overflow-hidden bg-slate-50">
      <CourierPageHeader
        icon={Bike}
        title="Pathao Courier"
        description="Connect your Pathao merchant account, quote delivery prices and ship captured orders."
      />

      <div className="flex-1 space-y-6 overflow-y-auto p-6 md:p-8">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <CourierConnectCard
            courierName="Pathao"
            fields={CONNECT_FIELDS}
            onConnect={credentials => apiService.connectPathao(credentials)}
            webhookHelp="Add these values to the webhook settings in your Pathao merchant panel to receive delivery updates."
          />
          <TrackConsignmentCard />
        </div>
        <CourierOrderList pages={pages} courierName="Pathao" onShip={setShippingOrder} />
      </div>

      {shippingOrder && (
        <PathaoShipModal key={shippingOrder.id} order={shippingOrder} onClose={() => setShippingOrder(null)} />
      )}
    </div>
  );
};

export default PathaoCourier;
