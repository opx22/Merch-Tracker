import React, { useState } from 'react';
import { Plus, Edit3, Trash2, Sparkles, Tag, X, Search } from 'lucide-react';
import { convertToSGD, formatCurrency } from '../utils/calculations';

export default function CatalogManager({ activeEvent, onUpdateCatalog }) {
  const catalog = activeEvent?.catalog || [];
  const rate = Number(activeEvent?.exchangeRate || 1);
  const currCode = activeEvent?.currencyCode || 'USD';

  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    price: '',
    comesWithPC: false,
    countsTowardsBenefit: true,
  });

  const handleStartAdd = () => {
    setFormData({ name: '', price: '', comesWithPC: false, countsTowardsBenefit: true });
    setShowAddModal(true);
  };

  const handleStartEdit = (item) => {
    setFormData({
      name: item.name,
      price: item.price,
      comesWithPC: Boolean(item.comesWithPC),
      countsTowardsBenefit: item.countsTowardsBenefit !== false,
    });
    setEditingId(item.id);
  };

  const handleSaveAdd = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.price) return;
    const newItem = {
      id: `item-${Date.now()}`,
      name: formData.name.trim(),
      price: Number(formData.price),
      comesWithPC: formData.comesWithPC,
      countsTowardsBenefit: formData.countsTowardsBenefit,
    };
    onUpdateCatalog([...catalog, newItem]);
    setShowAddModal(false);
  };

  const handleSaveEdit = (e, itemId) => {
    e.preventDefault();
    const updated = catalog.map((it) =>
      it.id === itemId
        ? {
            ...it,
            name: formData.name.trim(),
            price: Number(formData.price),
            comesWithPC: formData.comesWithPC,
            countsTowardsBenefit: formData.countsTowardsBenefit,
          }
        : it
    );
    onUpdateCatalog(updated);
    setEditingId(null);
  };

  const handleDelete = (itemId, name) => {
    if (confirm(`Remove "${name}" from this catalog?`)) {
      onUpdateCatalog(catalog.filter((it) => it.id !== itemId));
    }
  };

  const filteredCatalog = catalog.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4 pb-24">
      {/* Title & Action */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black font-heading text-[#23201c]">Merch Catalog</h2>
          <p className="text-xs text-[#716a5d]">{catalog.length} items registered in {activeEvent?.name}</p>
        </div>
        <button
          onClick={handleStartAdd}
          className="flex items-center gap-1.5 bg-gradient-to-r from-[#c05c3b] to-[#b45309] hover:from-[#ab4e31] hover:to-[#994607] text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-md shadow-[#c05c3b]/20 transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Add Item</span>
        </button>
      </div>

      {/* Search Input */}
      {catalog.length > 3 && (
        <div className="relative">
          <Search className="w-4 h-4 text-[#8c8273] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search catalog items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-[#ded5c2] rounded-xl pl-9 pr-4 py-2 text-xs text-[#23201c] placeholder-[#a89f91] focus:outline-none focus:border-[#c05c3b] shadow-inner transition"
          />
        </div>
      )}

      {/* Catalog Grid */}
      {filteredCatalog.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center border border-[#ded5c2] space-y-3">
          <Tag className="w-10 h-10 text-[#b4a997] mx-auto stroke-1" />
          <div>
            <h4 className="text-sm font-bold text-[#23201c]">No catalog items found</h4>
            <p className="text-xs text-[#716a5d] mt-0.5">Add official merchandise items with prices in {currCode}</p>
          </div>
          <button
            onClick={handleStartAdd}
            className="px-4 py-2 rounded-xl bg-[#f4eee2] hover:bg-[#ede5d6] text-xs font-bold text-[#3d3730] transition inline-block border border-[#ded5c2]"
          >
            + Register First Item
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredCatalog.map((item) => {
            const sgdPrice = convertToSGD(item.price, rate);
            const isEditingThis = editingId === item.id;

            if (isEditingThis) {
              return (
                <form
                  key={item.id}
                  onSubmit={(e) => handleSaveEdit(e, item.id)}
                  className="p-3.5 rounded-2xl bg-[#fefaf3] border border-[#c05c3b] space-y-3 shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-[#c05c3b]">Editing Item</span>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="p-1 text-[#8c8273] hover:text-[#23201c]"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Item name"
                      className="w-full bg-white border border-[#ded5c2] rounded-xl px-3 py-2 text-sm text-[#23201c] focus:outline-none focus:border-[#c05c3b] shadow-inner"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8c8273] text-[10px] font-mono">
                        {currCode}
                      </span>
                      <input
                        type="number"
                        step="any"
                        required
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        placeholder="Price"
                        className="w-full bg-white border border-[#ded5c2] rounded-xl pl-10 pr-3 py-2 text-sm text-[#23201c] font-mono focus:outline-none focus:border-[#c05c3b] shadow-inner"
                      />
                    </div>
                  <div className="grid grid-cols-1 gap-2">
                    <label className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#ded5c2] cursor-pointer select-none text-xs text-[#3d3730] font-semibold">
                      <input
                        type="checkbox"
                        checked={formData.countsTowardsBenefit}
                        onChange={(e) => setFormData({ ...formData, countsTowardsBenefit: e.target.checked })}
                        className="rounded border-[#ded5c2] text-[#c05c3b] focus:ring-0 w-4 h-4"
                      />
                      <span>Counts Towards Benefit 🎯</span>
                    </label>
                    <label className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#ded5c2] cursor-pointer select-none text-xs text-[#3d3730] font-semibold">
                      <input
                        type="checkbox"
                        checked={formData.comesWithPC}
                        onChange={(e) => setFormData({ ...formData, comesWithPC: e.target.checked })}
                        className="rounded border-[#ded5c2] text-[#c05c3b] focus:ring-0 w-4 h-4"
                      />
                      <span>Includes Album/Merch PC 🖼️</span>
                    </label>
                  </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2 rounded-xl bg-[#c05c3b] hover:bg-[#ab4e31] text-white text-xs font-bold transition shadow-sm"
                  >
                    Save Item
                  </button>
                </form>
              );
            }

            return (
              <div
                key={item.id}
                className="p-3.5 rounded-2xl bg-white border border-[#e6decb] hover:border-[#cfc4af] shadow-xs transition flex items-center justify-between gap-3 group"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <h4 className="text-sm font-extrabold text-[#23201c] truncate">{item.name}</h4>
                  </div>

                  <div className="flex items-center flex-wrap gap-2 text-xs">
                    <span className="font-mono font-extrabold text-[#23201c] bg-[#f4eee2] border border-[#e3d8c4] px-2 py-0.5 rounded-lg">
                      {formatCurrency(item.price, currCode)}
                    </span>
                    <span className="font-mono text-[#c05c3b] font-extrabold">
                      ≈ ${sgdPrice} SGD
                    </span>
                    {item.countsTowardsBenefit !== false ? (
                      <span className="inline-flex items-center gap-1 bg-[#fef3c7] border border-[#fde68a] text-[#b45309] text-[10px] font-extrabold px-2 py-0.5 rounded-md">
                        <Sparkles className="w-3 h-3" />
                        <span>Counts Towards Benefit</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-[#8c8273] bg-[#f4eee2] px-2 py-0.5 rounded-md">
                        Excluded from Benefit
                      </span>
                    )}
                    {item.comesWithPC && (
                      <span className="inline-flex items-center gap-1 bg-[#e0f2fe] border border-[#bae6fd] text-[#0369a1] text-[10px] font-extrabold px-2 py-0.5 rounded-md">
                        <span>Has Inclusion PC</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleStartEdit(item)}
                    className="p-2 rounded-xl bg-[#f4ede0] hover:bg-[#ebe1d0] text-[#5c5549] transition shadow-xs"
                    title="Edit item"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id, item.name)}
                    className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 transition"
                    title="Delete item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#23201c]/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white border border-[#ded5c2] rounded-3xl p-5 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[#f7ebe3] text-[#c05c3b]">
                  <Tag className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-black text-[#23201c] font-heading">Add Merch Item</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-[#8c8273] hover:text-[#23201c] text-sm font-semibold">
                Close
              </button>
            </div>

            <form onSubmit={handleSaveAdd} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-[#5c5549] block mb-1">Item Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Trading Card Set (Random 4pcs)"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-[#fcfaf6] border border-[#ded5c2] rounded-xl px-3.5 py-2.5 text-sm text-[#23201c] focus:outline-none focus:border-[#c05c3b] shadow-inner"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#5c5549] block mb-1">Price in {currCode}</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8c8273] text-xs font-mono">
                    {currCode}
                  </span>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="8000"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full bg-[#fcfaf6] border border-[#ded5c2] rounded-xl pl-12 pr-3.5 py-2.5 text-sm text-[#23201c] font-mono focus:outline-none focus:border-[#c05c3b] shadow-inner"
                  />
                </div>
              </div>

              <div className="bg-[#fcfaf6] border border-[#ded5c2] rounded-2xl p-3 flex items-center justify-between cursor-pointer shadow-xs" onClick={() => setFormData({ ...formData, countsTowardsBenefit: !formData.countsTowardsBenefit })}>
                <div>
                  <span className="text-xs font-extrabold text-[#23201c] block">Counts Towards Benefit Threshold 🎯</span>
                  <span className="text-[11px] text-[#716a5d]">Adds spend total to store benefit photocard threshold</span>
                </div>
                <input
                  type="checkbox"
                  checked={formData.countsTowardsBenefit}
                  onChange={(e) => setFormData({ ...formData, countsTowardsBenefit: e.target.checked })}
                  className="w-5 h-5 rounded border-[#ded5c2] text-[#c05c3b] focus:ring-0 cursor-pointer pointer-events-none"
                />
              </div>

              <div className="bg-[#fcfaf6] border border-[#ded5c2] rounded-2xl p-3 flex items-center justify-between cursor-pointer shadow-xs" onClick={() => setFormData({ ...formData, comesWithPC: !formData.comesWithPC })}>
                <div>
                  <span className="text-xs font-extrabold text-[#23201c] block">Includes Album / Merch PC 🖼️</span>
                  <span className="text-[11px] text-[#716a5d]">Item includes an in-pack inclusion photocard</span>
                </div>
                <input
                  type="checkbox"
                  checked={formData.comesWithPC}
                  onChange={(e) => setFormData({ ...formData, comesWithPC: e.target.checked })}
                  className="w-5 h-5 rounded border-[#ded5c2] text-[#c05c3b] focus:ring-0 cursor-pointer pointer-events-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#c05c3b] to-[#b45309] hover:from-[#ab4e31] hover:to-[#994607] text-white font-bold text-sm shadow-md shadow-[#c05c3b]/20 transition active:scale-95 mt-2"
              >
                Add Item to Catalog
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
