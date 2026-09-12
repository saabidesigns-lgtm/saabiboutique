import { supabase } from './supabase';

const PAYMENT_LABELS = { phonepe: 'PhonePe', card: 'Card', cod: 'COD' };

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

const formatMonthYear = (iso) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

// ── Products ─────────────────────────────────────────────────────────────

const productRowToApp = (row) => ({
  id: row.id,
  name: row.name,
  category: row.category,
  subCategory: row.sub_category || '',
  price: String(row.price),
  oldPrice: row.old_price != null ? String(row.old_price) : '',
  badge: row.badge || '',
  emoji: row.emoji || '🥻',
  color: row.color || '#fdf3e3',
  visible: row.visible,
  soldOut: row.sold_out || false,
  images: row.images || [],
  sizes: row.sizes || [],
  freeShipping: row.free_shipping,
  shippingCost: row.shipping_cost != null ? String(row.shipping_cost) : '',
  deliveryDays: row.delivery_days || '',
  codAvailable: row.cod_available,
  description: row.description || '',
});

const productAppToRow = (p) => ({
  name: p.name,
  category: p.category,
  sub_category: p.subCategory || '',
  price: parseFloat(p.price) || 0,
  old_price: p.oldPrice ? parseFloat(p.oldPrice) : null,
  badge: p.badge || '',
  emoji: p.emoji || '🥻',
  color: p.color || '#fdf3e3',
  visible: p.visible !== false,
  sold_out: !!p.soldOut,
  images: p.images || [],
  sizes: p.sizes || [],
  free_shipping: !!p.freeShipping,
  shipping_cost: !p.freeShipping && p.shippingCost ? parseFloat(p.shippingCost) : null,
  delivery_days: p.deliveryDays || '3-5 days',
  cod_available: p.codAvailable !== false,
  description: p.description || '',
});

export const getProducts = async () => {
  const { data, error } = await supabase.from('products').select('*').order('id');
  if (error) throw error;
  return (data || []).map(productRowToApp);
};

export const upsertProduct = async (product) => {
  const row = productAppToRow(product);
  if (product.id) {
    const { data, error } = await supabase.from('products').update(row).eq('id', product.id).select().single();
    if (error) throw error;
    return productRowToApp(data);
  }
  const { data, error } = await supabase.from('products').insert(row).select().single();
  if (error) throw error;
  return productRowToApp(data);
};

export const deleteProduct = async (id) => {
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw error;
};

export const setProductVisibility = async (id, visible) => {
  const { error } = await supabase.from('products').update({ visible }).eq('id', id);
  if (error) throw error;
};

export const setProductSoldOut = async (id, soldOut) => {
  const { error } = await supabase.from('products').update({ sold_out: soldOut }).eq('id', id);
  if (error) throw error;
};

// ── Categories & subcategories ──────────────────────────────────────────

export const getCategoriesWithSubcats = async () => {
  const { data: cats, error: catErr } = await supabase.from('categories').select('*').order('id');
  if (catErr) throw catErr;
  const { data: subs, error: subErr } = await supabase.from('subcategories').select('*').order('id');
  if (subErr) throw subErr;

  const categories = (cats || []).map((c) => c.name);
  const subCats = {};
  (cats || []).forEach((c) => { subCats[c.name] = []; });
  (subs || []).forEach((s) => {
    const cat = (cats || []).find((c) => c.id === s.category_id);
    if (cat) subCats[cat.name].push(s.name);
  });
  return { categories, subCats };
};

export const addCategory = async (name) => {
  const { error } = await supabase.from('categories').insert({ name });
  if (error && error.code !== '23505') throw error; // ignore "already exists"
};

export const deleteCategory = async (name, fallbackCategory) => {
  const { data: cat, error: findErr } = await supabase.from('categories').select('id').eq('name', name).single();
  if (findErr) throw findErr;
  const { error: delErr } = await supabase.from('categories').delete().eq('id', cat.id);
  if (delErr) throw delErr;
  const { error: updErr } = await supabase
    .from('products')
    .update({ category: fallbackCategory, sub_category: '' })
    .eq('category', name);
  if (updErr) throw updErr;
};

export const addSubcategory = async (categoryName, subName) => {
  const { data: cat, error: findErr } = await supabase.from('categories').select('id').eq('name', categoryName).single();
  if (findErr) throw findErr;
  const { error } = await supabase.from('subcategories').insert({ category_id: cat.id, name: subName });
  if (error && error.code !== '23505') throw error;
};

export const deleteSubcategory = async (categoryName, subName) => {
  const { data: cat, error: findErr } = await supabase.from('categories').select('id').eq('name', categoryName).single();
  if (findErr) throw findErr;
  const { error: delErr } = await supabase
    .from('subcategories')
    .delete()
    .eq('category_id', cat.id)
    .eq('name', subName);
  if (delErr) throw delErr;
  const { error: updErr } = await supabase
    .from('products')
    .update({ sub_category: '' })
    .eq('category', categoryName)
    .eq('sub_category', subName);
  if (updErr) throw updErr;
};

// ── Home / page content (singleton rows) ────────────────────────────────

export const getHomeContent = async () => {
  const { data, error } = await supabase.from('home_content').select('content').eq('id', 1).single();
  if (error) throw error;
  return data.content;
};

export const updateHomeContent = async (content) => {
  const { error } = await supabase
    .from('home_content')
    .upsert({ id: 1, content, updated_at: new Date().toISOString() });
  if (error) throw error;
};

export const getPageContent = async () => {
  const { data, error } = await supabase.from('page_content').select('content').eq('id', 1).single();
  if (error) throw error;
  return data.content;
};

export const updatePageContent = async (content) => {
  const { error } = await supabase
    .from('page_content')
    .upsert({ id: 1, content, updated_at: new Date().toISOString() });
  if (error) throw error;
};

// ── Orders ───────────────────────────────────────────────────────────────

export const createOrder = async ({
  userId, customerName, phone, address, city, zip,
  items, subtotal, shipping, total, paymentMethod, paymentStatus,
}) => {
  const { data, error } = await supabase
    .from('orders')
    .insert({
      user_id: userId || null,
      customer_name: customerName,
      phone,
      address,
      city,
      zip: zip || '',
      items,
      subtotal,
      shipping,
      total,
      payment_method: paymentMethod,
      payment_status: paymentStatus,
      status: 'Pending',
    })
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const getOrders = async () => {
  const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((row) => ({
    id: `#${row.id}`,
    rawId: row.id,
    customer: row.customer_name,
    phone: row.phone,
    address: row.address,
    items: row.items || [],
    itemsLabel: (row.items || []).map((i) => `${i.name} × ${i.qty}`),
    subtotal: Number(row.subtotal),
    shipping: Number(row.shipping),
    total: Number(row.total),
    totalLabel: `₹${Number(row.total).toFixed(2)}`,
    date: formatDate(row.created_at),
    payment: PAYMENT_LABELS[row.payment_method] || row.payment_method,
    paymentStatus: row.payment_status,
    status: row.status,
  }));
};

export const updateOrderStatus = async (displayId, status) => {
  const id = parseInt(String(displayId).replace('#', ''), 10);
  const { error } = await supabase.from('orders').update({ status }).eq('id', id);
  if (error) throw error;
};

// ── Customers (admin) ────────────────────────────────────────────────────

export const getCustomers = async () => {
  const { data: profiles, error: profileErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('is_admin', false)
    .order('created_at', { ascending: false });
  if (profileErr) throw profileErr;

  const { data: orders, error: orderErr } = await supabase.from('orders').select('user_id, total');
  if (orderErr) throw orderErr;

  const statsByUser = {};
  (orders || []).forEach((o) => {
    if (!o.user_id) return;
    if (!statsByUser[o.user_id]) statsByUser[o.user_id] = { orders: 0, spent: 0 };
    statsByUser[o.user_id].orders += 1;
    statsByUser[o.user_id].spent += Number(o.total);
  });

  return (profiles || []).map((p) => {
    const stats = statsByUser[p.id] || { orders: 0, spent: 0 };
    return {
      id: p.id,
      name: p.name || p.email || 'Customer',
      phone: p.phone || '',
      email: p.email || '',
      orders: stats.orders,
      spent: `₹${stats.spent.toFixed(2)}`,
      joined: formatMonthYear(p.created_at),
      status: p.is_blocked ? 'blocked' : 'active',
    };
  });
};

export const toggleCustomerBlock = async (id, currentlyBlocked) => {
  const { data, error } = await supabase
    .from('profiles')
    .update({ is_blocked: !currentlyBlocked })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data.is_blocked ? 'blocked' : 'active';
};

// ── Admin roles ──────────────────────────────────────────────────────────

export const getAdminAccounts = async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('is_admin', true)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((p) => ({
    id: p.id,
    name: p.name || p.email || 'Admin',
    email: p.email || '',
    role: p.role || 'staff',
    joined: formatMonthYear(p.created_at),
  }));
};

export const findUserByEmail = async (email) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email, is_admin, role')
    .ilike('email', email.trim())
    .maybeSingle();
  if (error) throw error;
  return data;
};

export const setAdminRole = async (userId, role) => {
  const { error } = await supabase.rpc('set_admin_role', { target_user_id: userId, new_role: role });
  if (error) throw error;
};

export const revokeAdminAccess = async (userId) => {
  const { error } = await supabase.rpc('set_admin_role', { target_user_id: userId, new_role: 'none' });
  if (error) throw error;
};

// ── Discount codes ──────────────────────────────────────────────────────

const discountRowToApp = (row) => ({
  id: row.id,
  code: row.code,
  type: row.type,
  value: String(row.value),
  minOrder: String(row.min_order),
  uses: row.uses,
  maxUses: row.max_uses,
  expiry: row.expiry || '',
  active: row.active,
});

export const getDiscountCodes = async () => {
  const { data, error } = await supabase.from('discount_codes').select('*').order('id');
  if (error) throw error;
  return (data || []).map(discountRowToApp);
};

export const createDiscountCode = async (form) => {
  const { data, error } = await supabase
    .from('discount_codes')
    .insert({
      code: form.code.toUpperCase(),
      type: form.type,
      value: parseFloat(form.value) || 0,
      min_order: parseFloat(form.minOrder) || 0,
      max_uses: parseInt(form.maxUses, 10) || 100,
      uses: 0,
      expiry: form.expiry || '',
      active: true,
    })
    .select()
    .single();
  if (error) throw error;
  return discountRowToApp(data);
};

export const updateDiscountCode = async (id, form) => {
  const { data, error } = await supabase
    .from('discount_codes')
    .update({
      code: form.code.toUpperCase(),
      type: form.type,
      value: parseFloat(form.value) || 0,
      min_order: parseFloat(form.minOrder) || 0,
      max_uses: parseInt(form.maxUses, 10) || 100,
      expiry: form.expiry || '',
    })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return discountRowToApp(data);
};

export const toggleDiscountActive = async (id, active) => {
  const { error } = await supabase.from('discount_codes').update({ active }).eq('id', id);
  if (error) throw error;
};

export const deleteDiscountCode = async (id) => {
  const { error } = await supabase.from('discount_codes').delete().eq('id', id);
  if (error) throw error;
};

// ── Image uploads ────────────────────────────────────────────────────────

export const uploadImage = async (blob, bucket) => {
  const ext = blob.type === 'image/png' ? 'png' : 'jpg';
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, blob, {
    contentType: blob.type || 'image/png',
  });
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
};
