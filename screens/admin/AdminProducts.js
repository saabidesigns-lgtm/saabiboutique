import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Modal, Image, Switch } from 'react-native';
import {
  upsertProduct, deleteProduct, setProductVisibility,
  addCategory as apiAddCategory, deleteCategory as apiDeleteCategory,
  addSubcategory as apiAddSubcategory, deleteSubcategory as apiDeleteSubcategory,
  uploadImage,
} from '../../utils/api';
import { notifyError } from '../../utils/notify';

const DEFAULT_CATS = ['Sarees', 'Kurtas', 'Lehengas', 'Salwar Suits'];


const ALL_SIZES    = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free Size'];
const DELIVERY_OPTS = ['1-2 days', '3-5 days', '5-7 days', '7-10 days'];
const EMPTY  = {
  name: '', category: 'Sarees', subCategory: '', price: '', oldPrice: '',
  badge: '', emoji: '🥻', visible: true, images: [], description: '',
  sizes: ['S', 'M', 'L', 'XL', 'XXL'],
  freeShipping: true, shippingCost: '', deliveryDays: '3-5 days', codAvailable: true,
};
const BADGES = ['', 'SALE', 'NEW'];
const EMOJIS = ['🥻', '👘', '✨', '🧵', '👒', '🌸', '💎', '🪡'];
const MAX_IMAGES = 6;

export default function AdminProducts({ products, onProductsRefresh, categories, subCats, onCategoriesRefresh, canManage = true }) {
  const [saving, setSaving]       = useState(false);
  const [filter, setFilter]       = useState('All');
  const [subFilter, setSubFilter] = useState('All');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]     = useState(null);
  const [form, setForm]           = useState(EMPTY);
  const [search, setSearch]       = useState('');

  // Preview lightbox
  const [previewOpen, setPreviewOpen]   = useState(false);
  const [previewImages, setPreviewImages] = useState([]);
  const [previewIdx, setPreviewIdx]     = useState(0);

  // Form validation
  const [formError, setFormError] = useState('');

  // New cat/subcat inline
  const [newCatInput, setNewCatInput]         = useState('');
  const [showNewCatInput, setShowNewCatInput] = useState(false);
  const [newSubInput, setNewSubInput]         = useState('');
  const [showNewSubInput, setShowNewSubInput] = useState(false);

  // Category manager
  const [catModalOpen, setCatModalOpen]   = useState(false);
  const [catManagerTab, setCatManagerTab] = useState('categories');
  const [managerNewSub, setManagerNewSub] = useState('');

  // ── helpers ──────────────────────────────────────────────────
  const getSubCats = (cat) => subCats[cat] || [];

  const filtered = products.filter((p) => {
    const matchCat    = filter === 'All' || p.category === filter;
    const matchSub    = subFilter === 'All' || p.subCategory === subFilter;
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSub && matchSearch;
  });

  const openAdd = () => {
    setEditing(null);
    setForm({ ...EMPTY, subCategory: getSubCats('Sarees')[0] || '' });
    setShowNewCatInput(false);
    setShowNewSubInput(false);
    setFormError('');
    setModalOpen(true);
  };
  const openEdit = (p) => {
    setEditing(p.id);
    setForm({ ...p, images: p.images || [] });
    setShowNewCatInput(false);
    setShowNewSubInput(false);
    setFormError('');
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setFormError('Product name is required.'); return; }
    if (!form.price.trim()) { setFormError('Price is required.'); return; }
    setFormError('');
    setSaving(true);
    try {
      await upsertProduct(editing ? { ...form, id: editing } : form);
      await onProductsRefresh();
      setModalOpen(false);
    } catch (e) {
      setFormError(e.message || 'Could not save product. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteProduct(id);
      await onProductsRefresh();
    } catch (e) { notifyError(e); }
  };

  const toggleVisible = async (id) => {
    const product = products.find((p) => p.id === id);
    if (!product) return;
    try {
      await setProductVisibility(id, !product.visible);
      await onProductsRefresh();
    } catch (e) { notifyError(e); }
  };

  // ── Category management ───────────────────────────────────────
  const addCategory = async (name) => {
    const n = (name || newCatInput).trim();
    if (!n || categories.map((c) => c.toLowerCase()).includes(n.toLowerCase())) {
      setNewCatInput(''); setShowNewCatInput(false); return;
    }
    try {
      await apiAddCategory(n);
      await onCategoriesRefresh();
      setForm((prev) => ({ ...prev, category: n, subCategory: '' }));
    } catch (e) { notifyError(e); }
    setNewCatInput(''); setShowNewCatInput(false);
  };

  const deleteCategory = async (catName) => {
    if (DEFAULT_CATS.includes(catName)) return;
    const fallback = categories.find((c) => c !== catName) || categories[0];
    try {
      await apiDeleteCategory(catName, fallback);
      await Promise.all([onCategoriesRefresh(), onProductsRefresh()]);
    } catch (e) { notifyError(e); }
    if (filter === catName) { setFilter('All'); setSubFilter('All'); }
  };

  // ── SubCategory management ────────────────────────────────────
  const addSubCat = async (cat, name) => {
    const n = (name || newSubInput).trim();
    if (!n) return;
    if (getSubCats(cat).map((s) => s.toLowerCase()).includes(n.toLowerCase())) {
      setNewSubInput(''); setShowNewSubInput(false); return;
    }
    try {
      await apiAddSubcategory(cat, n);
      await onCategoriesRefresh();
      setForm((prev) => ({ ...prev, subCategory: n }));
    } catch (e) { notifyError(e); }
    setNewSubInput(''); setShowNewSubInput(false);
  };

  const deleteSubCat = async (cat, sub) => {
    try {
      await apiDeleteSubcategory(cat, sub);
      await Promise.all([onCategoriesRefresh(), onProductsRefresh()]);
    } catch (e) { notifyError(e); }
    if (subFilter === sub) setSubFilter('All');
  };

  // ── Multi-image helpers ───────────────────────────────────────
  // Resizes to fit within maxDim, then uploads the compressed PNG to Supabase
  // Storage and resolves the public URL — quality loss from resizing only.
  const compressImageToBlob = (file, maxDim = 1200) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new window.Image();
        img.onload = () => {
          let { width, height } = img;

          // Scale down only — never upscale small images
          if (width > maxDim || height > maxDim) {
            const ratio = Math.min(maxDim / width, maxDim / height);
            width  = Math.round(width  * ratio);
            height = Math.round(height * ratio);
          }

          const canvas = document.createElement('canvas');
          canvas.width  = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.imageSmoothingEnabled  = true;
          ctx.imageSmoothingQuality  = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not process image'))), 'image/png');
        };
        img.onerror = () => reject(new Error('Could not read image'));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('Could not read file'));
      reader.readAsDataURL(file);
    });

  const uploadProductImage = async (file) => {
    const blob = await compressImageToBlob(file);
    return uploadImage(blob, 'product-images');
  };

  const [uploading, setUploading] = useState(false);

  const pickImages = async () => {
    const remaining = MAX_IMAGES - (form.images || []).length;
    if (remaining <= 0) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = async (e) => {
      const files = Array.from(e.target.files).slice(0, remaining);
      setUploading(true);
      try {
        const urls = await Promise.all(files.map((f) => uploadProductImage(f)));
        setForm((prev) => ({ ...prev, images: [...(prev.images || []), ...urls] }));
      } catch (e) {
        notifyError(e);
      } finally {
        setUploading(false);
      }
    };
    input.click();
  };

  const removeImage = (idx) =>
    setForm((prev) => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }));

  const setMainImage = (idx) => {
    if (idx === 0) return;
    setForm((prev) => {
      const imgs = [...prev.images];
      const [picked] = imgs.splice(idx, 1);
      imgs.unshift(picked);
      return { ...prev, images: imgs };
    });
  };

  const moveImage = (from, to) => {
    setForm((prev) => {
      const imgs = [...prev.images];
      const [item] = imgs.splice(from, 1);
      imgs.splice(to, 0, item);
      return { ...prev, images: imgs };
    });
  };

  const openPreview = (images, idx) => {
    setPreviewImages(images);
    setPreviewIdx(idx);
    setPreviewOpen(true);
  };

  // ─── Render ──────────────────────────────────────────────────
  const availableSubs = filter !== 'All' ? getSubCats(filter) : [];

  return (
    <View style={styles.wrapper}>
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.topRow}>
        <View>
          <Text style={styles.pageTitle}>👗 Products</Text>
          <Text style={styles.pageSub}>{products.length} total products{!canManage ? ' · View only' : ''}</Text>
        </View>
        {canManage && (
          <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
            <Text style={styles.addBtnText}>+ Add Product</Text>
          </TouchableOpacity>
        )}
      </View>

      <TextInput style={styles.searchInput} value={search} onChangeText={setSearch} placeholder="🔍  Search products..." placeholderTextColor="#bbb" />

      {/* Category filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
        <View style={styles.filterRow}>
          {['All', ...categories].map((c) => (
            <TouchableOpacity key={c} style={[styles.chip, filter === c && styles.chipActive]} onPress={() => { setFilter(c); setSubFilter('All'); }}>
              <Text style={[styles.chipText, filter === c && styles.chipTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
          {canManage && (
            <TouchableOpacity style={styles.manageCatBtn} onPress={() => { setCatManagerTab('categories'); setCatModalOpen(true); }}>
              <Text style={styles.manageCatText}>⚙️ Manage</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Subcategory filter */}
      {filter !== 'All' && availableSubs.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
          <View style={styles.filterRow}>
            {['All', ...availableSubs].map((s) => (
              <TouchableOpacity key={s} style={[styles.subChip, subFilter === s && styles.subChipActive]} onPress={() => setSubFilter(s)}>
                <Text style={[styles.subChipText, subFilter === s && styles.subChipTextActive]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}

      {/* Product List */}
      {filtered.map((p) => {
        const mainImg = p.images && p.images.length > 0 ? p.images[0] : null;
        return (
          <View key={p.id} style={[styles.productRow, !p.visible && styles.productRowHidden]}>
            <TouchableOpacity onPress={() => mainImg && openPreview(p.images, 0)} activeOpacity={mainImg ? 0.8 : 1}>
              {mainImg
                ? (
                  <View>
                    <Image source={{ uri: mainImg }} style={styles.productThumb} />
                    {p.images.length > 1 && (
                      <View style={styles.imgCountBadge}>
                        <Text style={styles.imgCountText}>+{p.images.length - 1}</Text>
                      </View>
                    )}
                  </View>
                )
                : <View style={styles.productEmojiBox}><Text style={styles.productEmoji}>{p.emoji}</Text></View>
              }
            </TouchableOpacity>
            <View style={styles.productInfo}>
              <View style={styles.productNameRow}>
                <Text style={styles.productName}>{p.name}</Text>
                {p.badge ? (
                  <View style={[styles.badge, p.badge === 'SALE' ? styles.badgeSale : styles.badgeNew]}>
                    <Text style={styles.badgeText}>{p.badge}</Text>
                  </View>
                ) : null}
                {!p.visible && <View style={styles.hiddenBadge}><Text style={styles.hiddenText}>Hidden</Text></View>}
              </View>
              <Text style={styles.productCat}>
                {p.category}{p.subCategory ? <Text style={styles.productSubCat}> › {p.subCategory}</Text> : null}
              </Text>
              <Text style={styles.productPrice}>
                ₹{p.price}{p.oldPrice ? <Text style={styles.oldPrice}>  ₹{p.oldPrice}</Text> : null}
              </Text>
              <Text style={styles.imgCountLabel}>{p.images?.length || 0} photo{p.images?.length !== 1 ? 's' : ''}</Text>
            </View>
            {canManage && (
              <View style={styles.productActions}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => toggleVisible(p.id)}>
                  <Text style={styles.actionIcon}>{p.visible ? '👁️' : '🚫'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => openEdit(p)}>
                  <Text style={styles.actionIcon}>✏️</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={() => handleDelete(p.id)}>
                  <Text style={styles.actionIcon}>🗑</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );
      })}

    </ScrollView>

      {/* ── Image Preview Lightbox ── */}
      <Modal visible={previewOpen} transparent animationType="fade">
        <View style={styles.lightboxOverlay}>
          <TouchableOpacity style={styles.lightboxClose} onPress={() => setPreviewOpen(false)}>
            <Text style={styles.lightboxCloseText}>✕</Text>
          </TouchableOpacity>
          {previewImages[previewIdx] && (
            <Image source={{ uri: previewImages[previewIdx] }} style={styles.lightboxImage} resizeMode="contain" />
          )}
          {previewImages.length > 1 && (
            <View style={styles.lightboxNav}>
              <TouchableOpacity style={styles.lightboxNavBtn} onPress={() => setPreviewIdx((i) => Math.max(0, i - 1))}>
                <Text style={styles.lightboxNavText}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.lightboxCounter}>{previewIdx + 1} / {previewImages.length}</Text>
              <TouchableOpacity style={styles.lightboxNavBtn} onPress={() => setPreviewIdx((i) => Math.min(previewImages.length - 1, i + 1))}>
                <Text style={styles.lightboxNavText}>›</Text>
              </TouchableOpacity>
            </View>
          )}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.lightboxThumbs}>
            {previewImages.map((img, i) => (
              <TouchableOpacity key={i} onPress={() => setPreviewIdx(i)}>
                <Image source={{ uri: img }} style={[styles.lightboxThumb, i === previewIdx && styles.lightboxThumbActive]} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* ── Category Manager Modal ── */}
      <Modal visible={catModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>⚙️ Manage Categories</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <View style={styles.tabRow}>
                <TouchableOpacity style={[styles.tab, catManagerTab === 'categories' && styles.tabActive]} onPress={() => setCatManagerTab('categories')}>
                  <Text style={[styles.tabText, catManagerTab === 'categories' && styles.tabTextActive]}>Categories</Text>
                </TouchableOpacity>
                {categories.map((c) => (
                  <TouchableOpacity key={c} style={[styles.tab, catManagerTab === c && styles.tabActive]} onPress={() => setCatManagerTab(c)}>
                    <Text style={[styles.tabText, catManagerTab === c && styles.tabTextActive]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            {catManagerTab === 'categories' && (
              <>
                <Text style={styles.catManagerSub}>Tap a tab above to manage subcategories.</Text>
                {categories.map((cat) => {
                  const isDefault = DEFAULT_CATS.includes(cat);
                  const count = products.filter((p) => p.category === cat).length;
                  return (
                    <View key={cat} style={styles.catRow}>
                      <View style={styles.catRowLeft}>
                        <Text style={styles.catRowName}>{cat}</Text>
                        <Text style={styles.catRowCount}>{count} products · {getSubCats(cat).length} subcategories</Text>
                      </View>
                      {isDefault
                        ? <View style={styles.catDefaultBadge}><Text style={styles.catDefaultText}>Built-in</Text></View>
                        : <TouchableOpacity style={styles.catDeleteBtn} onPress={() => deleteCategory(cat)}><Text style={styles.catDeleteText}>🗑 Delete</Text></TouchableOpacity>
                      }
                    </View>
                  );
                })}
                <View style={styles.divider} />
                <Text style={styles.fieldLabel}>Add New Category</Text>
                <View style={styles.newCatRow}>
                  <TextInput style={[styles.newCatInput, { flex: 1 }]} value={newCatInput} onChangeText={setNewCatInput} placeholder="e.g. Dupattas, Blouses..." placeholderTextColor="#bbb" onSubmitEditing={() => addCategory()} />
                  <TouchableOpacity style={styles.newCatAdd} onPress={() => addCategory()}><Text style={styles.newCatAddText}>Add</Text></TouchableOpacity>
                </View>
              </>
            )}
            {catManagerTab !== 'categories' && (
              <>
                <Text style={styles.catManagerSub}>Subcategories for <Text style={{ fontWeight: '800', color: '#C4922A' }}>{catManagerTab}</Text></Text>
                {getSubCats(catManagerTab).length === 0 && <Text style={styles.emptySubText}>No subcategories yet.</Text>}
                {getSubCats(catManagerTab).map((sub) => {
                  const count = products.filter((p) => p.category === catManagerTab && p.subCategory === sub).length;
                  return (
                    <View key={sub} style={styles.catRow}>
                      <View style={styles.catRowLeft}>
                        <Text style={styles.catRowName}>{sub}</Text>
                        <Text style={styles.catRowCount}>{count} product{count !== 1 ? 's' : ''}</Text>
                      </View>
                      <TouchableOpacity style={styles.catDeleteBtn} onPress={() => deleteSubCat(catManagerTab, sub)}><Text style={styles.catDeleteText}>🗑 Delete</Text></TouchableOpacity>
                    </View>
                  );
                })}
                <View style={styles.divider} />
                <Text style={styles.fieldLabel}>Add Subcategory</Text>
                <View style={styles.newCatRow}>
                  <TextInput style={[styles.newCatInput, { flex: 1 }]} value={managerNewSub} onChangeText={setManagerNewSub} placeholder="e.g. Tussar, Patola..." placeholderTextColor="#bbb" onSubmitEditing={() => { addSubCat(catManagerTab, managerNewSub); setManagerNewSub(''); }} />
                  <TouchableOpacity style={styles.newCatAdd} onPress={() => { addSubCat(catManagerTab, managerNewSub); setManagerNewSub(''); }}><Text style={styles.newCatAddText}>Add</Text></TouchableOpacity>
                </View>
              </>
            )}
            <TouchableOpacity style={[styles.saveBtn, { marginTop: 20 }]} onPress={() => { setCatModalOpen(false); setNewCatInput(''); setManagerNewSub(''); }}>
              <Text style={styles.saveBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Add / Edit Product Modal ── */}
      <Modal visible={modalOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>{editing ? 'Edit Product' : 'Add New Product'}</Text>

              {/* ── Multi-Image Section ── */}
              <View style={styles.imgSectionHeader}>
                <Text style={styles.fieldLabel}>Product Images</Text>
                <Text style={styles.imgCountHint}>{(form.images || []).length} / {MAX_IMAGES} photos</Text>
              </View>

              {/* Image grid */}
              {(form.images || []).length > 0 && (
                <View style={styles.imageGrid}>
                  {(form.images || []).map((img, idx) => (
                    <View key={idx} style={styles.imageGridItem}>
                      <Image source={{ uri: img }} style={styles.gridImage} />

                      {/* Main badge */}
                      {idx === 0 && (
                        <View style={styles.mainBadge}><Text style={styles.mainBadgeText}>MAIN</Text></View>
                      )}

                      {/* Action row */}
                      <View style={styles.gridActions}>
                        {idx !== 0 && (
                          <TouchableOpacity style={styles.gridActionBtn} onPress={() => setMainImage(idx)}>
                            <Text style={styles.gridActionText}>⭐</Text>
                          </TouchableOpacity>
                        )}
                        {idx > 0 && (
                          <TouchableOpacity style={styles.gridActionBtn} onPress={() => moveImage(idx, idx - 1)}>
                            <Text style={styles.gridActionText}>←</Text>
                          </TouchableOpacity>
                        )}
                        {idx < (form.images || []).length - 1 && (
                          <TouchableOpacity style={styles.gridActionBtn} onPress={() => moveImage(idx, idx + 1)}>
                            <Text style={styles.gridActionText}>→</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity style={[styles.gridActionBtn, styles.gridDeleteBtn]} onPress={() => removeImage(idx)}>
                          <Text style={styles.gridActionText}>🗑</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}

                  {/* Add more tile */}
                  {(form.images || []).length < MAX_IMAGES && (
                    <TouchableOpacity style={styles.addMoreTile} onPress={pickImages} disabled={uploading}>
                      <Text style={styles.addMoreIcon}>➕</Text>
                      <Text style={styles.addMoreText}>{uploading ? 'Uploading...' : 'Add More'}</Text>
                      <Text style={styles.addMoreSub}>{MAX_IMAGES - (form.images || []).length} left</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Empty upload zone */}
              {(form.images || []).length === 0 && (
                <TouchableOpacity style={styles.imagePicker} onPress={pickImages} disabled={uploading}>
                  <Text style={styles.imagePickerIcon}>🖼️</Text>
                  <Text style={styles.imagePickerTitle}>Upload Product Photos</Text>
                  <Text style={styles.imagePickerSub}>Select up to {MAX_IMAGES} images at once</Text>
                  <View style={styles.imagePickerBtn}><Text style={styles.imagePickerBtnText}>{uploading ? 'Uploading...' : '📁 Browse Files'}</Text></View>
                </TouchableOpacity>
              )}

              <View style={styles.imgTipsRow}>
                <Text style={styles.imgTip}>⭐ Tap star to set main photo</Text>
                <Text style={styles.imgTip}>← → to reorder</Text>
              </View>

              {/* Name */}
              <Text style={styles.fieldLabel}>Product Name *</Text>
              <TextInput
                style={[styles.fieldInput, formError && !form.name.trim() && styles.fieldInputError]}
                value={form.name}
                onChangeText={(v) => { setForm({ ...form, name: v }); if (v.trim()) setFormError(''); }}
                placeholder="e.g. Banarasi Silk Saree"
                placeholderTextColor="#bbb"
              />

              {/* Category */}
              <Text style={styles.fieldLabel}>Category</Text>
              <View style={styles.optionRow}>
                {categories.map((c) => (
                  <TouchableOpacity key={c} style={[styles.optionChip, form.category === c && styles.optionChipActive]} onPress={() => { const firstSub = getSubCats(c)[0] || ''; setForm({ ...form, category: c, subCategory: firstSub }); }}>
                    <Text style={[styles.optionText, form.category === c && styles.optionTextActive]}>{c}</Text>
                  </TouchableOpacity>
                ))}
                {showNewCatInput ? (
                  <View style={styles.newCatRow}>
                    <TextInput style={styles.newCatInput} value={newCatInput} onChangeText={setNewCatInput} placeholder="Category name" placeholderTextColor="#bbb" autoFocus onSubmitEditing={() => addCategory()} />
                    <TouchableOpacity style={styles.newCatAdd} onPress={() => addCategory()}><Text style={styles.newCatAddText}>Add</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.newCatCancel} onPress={() => { setShowNewCatInput(false); setNewCatInput(''); }}><Text style={styles.newCatCancelText}>✕</Text></TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.addCatChip} onPress={() => setShowNewCatInput(true)}>
                    <Text style={styles.addCatText}>+ New</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Sub Category */}
              <Text style={styles.fieldLabel}>Sub Category <Text style={styles.fieldLabelNote}>(optional)</Text></Text>
              <View style={styles.optionRow}>
                <TouchableOpacity style={[styles.subOptionChip, form.subCategory === '' && styles.subOptionChipActive]} onPress={() => setForm({ ...form, subCategory: '' })}>
                  <Text style={[styles.subOptionText, form.subCategory === '' && styles.subOptionTextActive]}>None</Text>
                </TouchableOpacity>
                {getSubCats(form.category).map((s) => (
                  <TouchableOpacity key={s} style={[styles.subOptionChip, form.subCategory === s && styles.subOptionChipActive]} onPress={() => setForm({ ...form, subCategory: s })}>
                    <Text style={[styles.subOptionText, form.subCategory === s && styles.subOptionTextActive]}>{s}</Text>
                  </TouchableOpacity>
                ))}
                {showNewSubInput ? (
                  <View style={styles.newCatRow}>
                    <TextInput style={styles.newCatInput} value={newSubInput} onChangeText={setNewSubInput} placeholder="Subcategory name" placeholderTextColor="#bbb" autoFocus onSubmitEditing={() => addSubCat(form.category)} />
                    <TouchableOpacity style={styles.newCatAdd} onPress={() => addSubCat(form.category)}><Text style={styles.newCatAddText}>Add</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.newCatCancel} onPress={() => { setShowNewSubInput(false); setNewSubInput(''); }}><Text style={styles.newCatCancelText}>✕</Text></TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.addSubChip} onPress={() => setShowNewSubInput(true)}>
                    <Text style={styles.addSubText}>+ New Sub</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Prices */}
              <View style={styles.priceRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Price (₹) *</Text>
                  <TextInput
                    style={[styles.fieldInput, formError && !form.price.trim() && styles.fieldInputError]}
                    value={form.price}
                    onChangeText={(v) => { setForm({ ...form, price: v }); if (v.trim()) setFormError(''); }}
                    placeholder="89.99"
                    placeholderTextColor="#bbb"
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Old Price (₹)</Text>
                  <TextInput style={styles.fieldInput} value={form.oldPrice} onChangeText={(v) => setForm({ ...form, oldPrice: v })} placeholder="119.99" placeholderTextColor="#bbb" keyboardType="decimal-pad" />
                </View>
              </View>

              {/* Badge */}
              <Text style={styles.fieldLabel}>Badge</Text>
              <View style={styles.optionRow}>
                {BADGES.map((b) => (
                  <TouchableOpacity key={b || 'none'} style={[styles.optionChip, form.badge === b && styles.optionChipActive]} onPress={() => setForm({ ...form, badge: b })}>
                    <Text style={[styles.optionText, form.badge === b && styles.optionTextActive]}>{b || 'None'}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Emoji */}
              <Text style={styles.fieldLabel}>Emoji <Text style={styles.fieldLabelNote}>(shown when no photo)</Text></Text>
              <View style={styles.optionRow}>
                {EMOJIS.map((e) => (
                  <TouchableOpacity key={e} style={[styles.emojiChip, form.emoji === e && styles.emojiChipActive]} onPress={() => setForm({ ...form, emoji: e })}>
                    <Text style={styles.emojiText}>{e}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Sizes */}
              <Text style={styles.fieldLabel}>Available Sizes</Text>
              <View style={styles.optionRow}>
                {ALL_SIZES.map((sz) => {
                  const selected = (form.sizes || []).includes(sz);
                  return (
                    <TouchableOpacity
                      key={sz}
                      style={[styles.sizeChipPicker, selected && styles.sizeChipPickerActive]}
                      onPress={() => {
                        const cur = form.sizes || [];
                        setForm({ ...form, sizes: selected ? cur.filter((s) => s !== sz) : [...cur, sz] });
                      }}
                    >
                      <Text style={[styles.sizeChipPickerText, selected && styles.sizeChipPickerTextActive]}>{sz}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Description */}
              <Text style={styles.fieldLabel}>Description <Text style={styles.fieldLabelNote}>(optional)</Text></Text>
              <TextInput
                style={[styles.fieldInput, styles.descriptionInput]}
                value={form.description || ''}
                onChangeText={(v) => setForm({ ...form, description: v })}
                placeholder="Describe the product — fabric, occasion, style details..."
                placeholderTextColor="#bbb"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              {/* ── Shipping ── */}
              <View style={styles.shippingBox}>
                <Text style={styles.shippingBoxTitle}>🚚 Shipping Options</Text>

                {/* Free / Paid toggle */}
                <View style={styles.switchRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.switchLabel}>Free Shipping</Text>
                    <Text style={styles.switchSub}>{form.freeShipping ? 'No shipping charge' : 'Customer pays shipping'}</Text>
                  </View>
                  <Switch
                    value={form.freeShipping}
                    onValueChange={(v) => setForm({ ...form, freeShipping: v, shippingCost: v ? '' : form.shippingCost })}
                    trackColor={{ false: '#ddd', true: '#C4922A' }}
                    thumbColor="#fff"
                  />
                </View>

                {/* Cost — shown only when not free */}
                {!form.freeShipping && (
                  <>
                    <Text style={styles.fieldLabel}>Shipping Cost (₹)</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={form.shippingCost}
                      onChangeText={(v) => setForm({ ...form, shippingCost: v })}
                      placeholder="e.g. 49"
                      placeholderTextColor="#bbb"
                      keyboardType="decimal-pad"
                    />
                  </>
                )}

                {/* Delivery time */}
                <Text style={styles.fieldLabel}>Estimated Delivery</Text>
                <View style={styles.optionRow}>
                  {DELIVERY_OPTS.map((d) => (
                    <TouchableOpacity
                      key={d}
                      style={[styles.optionChip, form.deliveryDays === d && styles.optionChipActive]}
                      onPress={() => setForm({ ...form, deliveryDays: d })}
                    >
                      <Text style={[styles.optionText, form.deliveryDays === d && styles.optionTextActive]}>{d}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* COD */}
                <View style={[styles.switchRow, { marginTop: 14, marginBottom: 0 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.switchLabel}>Cash on Delivery (COD)</Text>
                    <Text style={styles.switchSub}>{form.codAvailable ? 'COD available' : 'Prepaid only'}</Text>
                  </View>
                  <Switch
                    value={form.codAvailable}
                    onValueChange={(v) => setForm({ ...form, codAvailable: v })}
                    trackColor={{ false: '#ddd', true: '#C4922A' }}
                    thumbColor="#fff"
                  />
                </View>
              </View>

              {formError ? (
                <View style={styles.formErrorBox}>
                  <Text style={styles.formErrorText}>⚠️ {formError}</Text>
                </View>
              ) : null}

              <View style={styles.modalBtns}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalOpen(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                  <Text style={styles.saveBtnText}>{saving ? 'Saving...' : editing ? 'Save Changes' : 'Add Product'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  container: { flex: 1, backgroundColor: '#F8F5F0', padding: 24 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  pageTitle: { fontSize: 26, fontWeight: '900', color: '#1C1611' },
  pageSub: { fontSize: 13, color: '#999', marginTop: 2 },
  addBtn: { backgroundColor: '#C4922A', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  searchInput: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#F0E6CC', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#333', marginBottom: 12 },
  filterRow: { flexDirection: 'row', gap: 8, paddingBottom: 4 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E8D5A3' },
  chipActive: { backgroundColor: '#C4922A', borderColor: '#C4922A' },
  chipText: { fontSize: 13, color: '#888', fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  manageCatBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#1C1611' },
  manageCatText: { fontSize: 13, color: '#C4922A', fontWeight: '700' },
  subChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E8D5A3' },
  subChipActive: { backgroundColor: '#1C1611', borderColor: '#1C1611' },
  subChipText: { fontSize: 12, color: '#aaa', fontWeight: '600' },
  subChipTextActive: { color: '#C4922A', fontWeight: '700' },

  /* Product row */
  productRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#F0E6CC' },
  productRowHidden: { opacity: 0.5 },
  productThumb: { width: 64, height: 64, borderRadius: 10, resizeMode: 'cover', backgroundColor: '#F0E6CC', overflow: 'hidden' },
  productEmojiBox: { width: 64, height: 64, borderRadius: 10, backgroundColor: '#FDF3E3', alignItems: 'center', justifyContent: 'center' },
  productEmoji: { fontSize: 30 },
  imgCountBadge: { position: 'absolute', bottom: 4, right: 4, backgroundColor: 'rgba(28,22,17,0.75)', borderRadius: 8, paddingHorizontal: 5, paddingVertical: 2 },
  imgCountText: { color: '#C4922A', fontSize: 10, fontWeight: '800' },
  productInfo: { flex: 1 },
  productNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  productName: { fontSize: 15, fontWeight: '700', color: '#1C1611' },
  badge: { borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  badgeSale: { backgroundColor: '#FDE8CC' },
  badgeNew: { backgroundColor: '#D4F5E2' },
  badgeText: { fontSize: 10, fontWeight: '800', color: '#C4922A' },
  hiddenBadge: { backgroundColor: '#eee', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  hiddenText: { fontSize: 10, color: '#999', fontWeight: '700' },
  productCat: { fontSize: 12, color: '#aaa', marginTop: 2 },
  productSubCat: { color: '#C4922A', fontWeight: '700' },
  productPrice: { fontSize: 15, fontWeight: '800', color: '#C4922A', marginTop: 4 },
  oldPrice: { fontSize: 12, color: '#bbb', textDecorationLine: 'line-through' },
  imgCountLabel: { fontSize: 11, color: '#bbb', marginTop: 3 },
  productActions: { flexDirection: 'row', gap: 4 },
  actionBtn: { padding: 8, borderRadius: 10, backgroundColor: '#F8F5F0' },
  deleteBtn: { backgroundColor: '#fff0f0' },
  actionIcon: { fontSize: 16 },

  /* Lightbox */
  lightboxOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center' },
  lightboxClose: { position: 'absolute', top: 20, right: 20, zIndex: 10, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  lightboxCloseText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  lightboxImage: { width: '90%', height: '65%' },
  lightboxNav: { flexDirection: 'row', alignItems: 'center', gap: 24, marginTop: 16 },
  lightboxNavBtn: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 24, width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  lightboxNavText: { color: '#fff', fontSize: 28, fontWeight: '700' },
  lightboxCounter: { color: '#fff', fontSize: 15, fontWeight: '600' },
  lightboxThumbs: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12, marginTop: 8 },
  lightboxThumb: { width: 60, height: 60, borderRadius: 10, opacity: 0.5 },
  lightboxThumbActive: { opacity: 1, borderWidth: 2, borderColor: '#C4922A' },

  /* Modals */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' },
  modalScroll: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '100%', maxWidth: 520 },
  modalTitle: { fontSize: 20, fontWeight: '900', color: '#1C1611', marginBottom: 12 },

  /* Image section */
  imgSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 },
  imgCountHint: { fontSize: 12, color: '#aaa', fontWeight: '600' },
  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8, marginBottom: 4 },
  imageGridItem: { width: 140, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#F0E6CC', backgroundColor: '#F8F5F0' },
  gridImage: { width: '100%', height: 120, resizeMode: 'cover' },
  mainBadge: { position: 'absolute', top: 6, left: 6, backgroundColor: '#C4922A', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  mainBadgeText: { color: '#fff', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  gridActions: { flexDirection: 'row', padding: 6, gap: 4, backgroundColor: '#fff' },
  gridActionBtn: { flex: 1, backgroundColor: '#F8F5F0', borderRadius: 8, paddingVertical: 5, alignItems: 'center' },
  gridDeleteBtn: { backgroundColor: '#fff0f0' },
  gridActionText: { fontSize: 14 },
  addMoreTile: { width: 140, height: 160, borderWidth: 2, borderColor: '#E8D5A3', borderStyle: 'dashed', borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FDFAF5', gap: 4 },
  addMoreIcon: { fontSize: 28 },
  addMoreText: { fontSize: 13, fontWeight: '700', color: '#C4922A' },
  addMoreSub: { fontSize: 11, color: '#bbb' },
  imagePicker: { borderWidth: 2, borderColor: '#E8D5A3', borderStyle: 'dashed', borderRadius: 16, padding: 28, alignItems: 'center', backgroundColor: '#FDFAF5', marginTop: 8, marginBottom: 4 },
  imagePickerIcon: { fontSize: 40, marginBottom: 10 },
  imagePickerTitle: { fontSize: 15, fontWeight: '700', color: '#1C1611', marginBottom: 4 },
  imagePickerSub: { fontSize: 12, color: '#aaa', marginBottom: 14 },
  imagePickerBtn: { backgroundColor: '#C4922A', paddingHorizontal: 20, paddingVertical: 9, borderRadius: 20 },
  imagePickerBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  imgTipsRow: { flexDirection: 'row', gap: 16, marginTop: 6, marginBottom: 4 },
  imgTip: { fontSize: 11, color: '#bbb' },

  /* Category manager */
  tabRow: { flexDirection: 'row', gap: 6 },
  tab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#F8F5F0', borderWidth: 1, borderColor: '#E8D5A3' },
  tabActive: { backgroundColor: '#1C1611', borderColor: '#1C1611' },
  tabText: { fontSize: 13, color: '#888', fontWeight: '600' },
  tabTextActive: { color: '#C4922A', fontWeight: '800' },
  catManagerSub: { fontSize: 12, color: '#aaa', marginBottom: 14 },
  emptySubText: { fontSize: 13, color: '#bbb', textAlign: 'center', paddingVertical: 16, fontStyle: 'italic' },
  catRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0E6CC' },
  catRowLeft: { flex: 1 },
  catRowName: { fontSize: 15, fontWeight: '700', color: '#1C1611' },
  catRowCount: { fontSize: 12, color: '#aaa', marginTop: 2 },
  catDefaultBadge: { backgroundColor: '#F0E6CC', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  catDefaultText: { fontSize: 11, color: '#aaa', fontWeight: '700' },
  catDeleteBtn: { backgroundColor: '#fff0f0', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  catDeleteText: { fontSize: 12, color: '#e63946', fontWeight: '700' },
  divider: { height: 1, backgroundColor: '#F0E6CC', marginVertical: 14 },

  /* Form fields */
  fieldLabel: { fontSize: 11, fontWeight: '700', color: '#C4922A', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, marginTop: 14 },
  fieldLabelNote: { fontSize: 10, color: '#bbb', textTransform: 'none', letterSpacing: 0, fontWeight: '500' },
  fieldInput: { borderWidth: 1, borderColor: '#E8D5A3', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#333', backgroundColor: '#FDFAF5' },
  descriptionInput: { minHeight: 100, textAlignVertical: 'top' },
  shippingBox: { backgroundColor: '#F8F5F0', borderRadius: 14, padding: 16, marginTop: 18 },
  shippingBoxTitle: { fontSize: 13, fontWeight: '800', color: '#1C1611', marginBottom: 14 },
  switchRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  switchLabel: { fontSize: 14, fontWeight: '700', color: '#1C1611' },
  switchSub: { fontSize: 11, color: '#aaa', marginTop: 2 },
  sizeChipPicker: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: '#E8D5A3', backgroundColor: '#FDFAF5', minWidth: 44, alignItems: 'center' },
  sizeChipPickerActive: { backgroundColor: '#1C1611', borderColor: '#1C1611' },
  sizeChipPickerText: { fontSize: 13, color: '#aaa', fontWeight: '600' },
  sizeChipPickerTextActive: { color: '#C4922A', fontWeight: '800' },
  fieldInputError: { borderColor: '#e63946', borderWidth: 2 },
  formErrorBox: { backgroundColor: '#fff0f0', borderRadius: 10, padding: 10, marginTop: 12 },
  formErrorText: { color: '#e63946', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  priceRow: { flexDirection: 'row', gap: 12 },
  optionRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  optionChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: '#E8D5A3', backgroundColor: '#FDFAF5' },
  optionChipActive: { backgroundColor: '#C4922A', borderColor: '#C4922A' },
  optionText: { fontSize: 13, color: '#888' },
  optionTextActive: { color: '#fff', fontWeight: '700' },
  subOptionChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: '#E8D5A3', backgroundColor: '#FDFAF5' },
  subOptionChipActive: { backgroundColor: '#1C1611', borderColor: '#1C1611' },
  subOptionText: { fontSize: 13, color: '#888' },
  subOptionTextActive: { color: '#C4922A', fontWeight: '700' },
  addSubChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: '#1C1611', borderStyle: 'dashed' },
  addSubText: { fontSize: 13, color: '#1C1611', fontWeight: '700' },
  emojiChip: { width: 44, height: 44, borderRadius: 12, borderWidth: 2, borderColor: '#E8D5A3', alignItems: 'center', justifyContent: 'center' },
  emojiChipActive: { borderColor: '#C4922A', backgroundColor: '#FDF3E3' },
  emojiText: { fontSize: 22 },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 24 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 20, borderWidth: 1, borderColor: '#E8D5A3', alignItems: 'center' },
  cancelText: { color: '#888', fontWeight: '700' },
  saveBtn: { flex: 1, paddingVertical: 12, borderRadius: 20, backgroundColor: '#C4922A', alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  newCatRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  newCatInput: { borderWidth: 1, borderColor: '#E8D5A3', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, fontSize: 13, color: '#333', backgroundColor: '#FDFAF5', minWidth: 120 },
  newCatAdd: { backgroundColor: '#C4922A', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  newCatAddText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  newCatCancel: { paddingHorizontal: 10, paddingVertical: 8 },
  newCatCancelText: { color: '#999', fontSize: 16 },
  addCatChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: '#C4922A', borderStyle: 'dashed' },
  addCatText: { fontSize: 13, color: '#C4922A', fontWeight: '700' },
});
