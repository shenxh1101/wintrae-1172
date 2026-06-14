import { useState, useMemo } from 'react';
import {
  Package,
  Plus,
  Minus,
  Search,
  Clock,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useAppStore } from '@/store/useAppStore';
import Tabs from '@/components/Tabs';
import Modal from '@/components/Modal';

const tabItems = [
  { key: 'list', label: '耗材列表' },
  { key: 'records', label: '领用记录' },
];

export default function ConsumablesPage() {
  const {
    consumables,
    consumptionRecords,
    getMyReservations,
    getConsumableById,
    addConsumptionRecord,
    currentUserId,
    getEquipmentById,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState('list');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showUseModal, setShowUseModal] = useState(false);
  const [selectedConsumable, setSelectedConsumable] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [remark, setRemark] = useState('');
  const [selectedReservation, setSelectedReservation] = useState('');

  const categories = useMemo(() => {
    const cats = new Set(consumables.map((c) => c.category));
    return Array.from(cats);
  }, [consumables]);

  const filteredConsumables = useMemo(() => {
    return consumables.filter((c) => {
      if (searchKeyword && !c.name.toLowerCase().includes(searchKeyword.toLowerCase())) {
        return false;
      }
      if (categoryFilter && c.category !== categoryFilter) {
        return false;
      }
      return true;
    });
  }, [consumables, searchKeyword, categoryFilter]);

  const myRecords = useMemo(() => {
    return consumptionRecords
      .filter((r) => r.userId === currentUserId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [consumptionRecords, currentUserId]);

  const myReservations = useMemo(() => {
    return getMyReservations().filter(
      (r) => r.status === 'approved' || r.status === 'checked-in' || r.status === 'completed'
    );
  }, [getMyReservations]);

  const consumable = selectedConsumable ? getConsumableById(selectedConsumable) : null;

  const handleUse = (consumableId: string) => {
    setSelectedConsumable(consumableId);
    setQuantity(1);
    setRemark('');
    setSelectedReservation('');
    setShowUseModal(true);
  };

  const handleSubmit = () => {
    if (!selectedConsumable || quantity <= 0) return;

    addConsumptionRecord({
      consumableId: selectedConsumable,
      reservationId: selectedReservation || undefined,
      userId: currentUserId,
      quantity,
      remark,
    });

    setShowUseModal(false);
    setSelectedConsumable(null);
  };

  const getStockStatus = (stock: number) => {
    if (stock <= 0) return { text: '缺货', className: 'text-danger-500 bg-danger-50' };
    if (stock < 100) return { text: '库存紧张', className: 'text-warning-500 bg-warning-50' };
    return { text: '库存充足', className: 'text-success-500 bg-success-50' };
  };

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-sm text-neutral-500 mb-1">耗材种类</p>
          <p className="text-2xl font-bold text-neutral-800">{consumables.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-neutral-500 mb-1">库存紧张</p>
          <p className="text-2xl font-bold text-warning-500">
            {consumables.filter((c) => c.stock > 0 && c.stock < 100).length}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-neutral-500 mb-1">已缺货</p>
          <p className="text-2xl font-bold text-danger-500">
            {consumables.filter((c) => c.stock <= 0).length}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-neutral-500 mb-1">本月领用</p>
          <p className="text-2xl font-bold text-primary-500">{myRecords.length}</p>
        </div>
      </div>

      {/* Tab 切换 */}
      <div className="card p-2">
        <Tabs items={tabItems} activeKey={activeTab} onChange={setActiveTab} />
      </div>

      {activeTab === 'list' && (
        <>
          {/* 搜索筛选 */}
          <div className="card p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type="text"
                  placeholder="搜索耗材名称..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="input pl-10"
                />
              </div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="select min-w-[140px]"
              >
                <option value="">全部分类</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 耗材列表 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredConsumables.map((item) => {
              const stockStatus = getStockStatus(item.stock);
              return (
                <div key={item.id} className="card card-hover p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-12 h-12 rounded-lg bg-primary-50 flex items-center justify-center">
                      <Package className="w-6 h-6 text-primary-500" />
                    </div>
                    <span className={`badge ${stockStatus.className}`}>{stockStatus.text}</span>
                  </div>

                  <h3 className="font-semibold text-neutral-800 mb-1">{item.name}</h3>
                  <p className="text-xs text-neutral-500 mb-3">{item.category}</p>

                  <div className="space-y-1 mb-4">
                    <div className="flex justify-between text-xs">
                      <span className="text-neutral-500">规格</span>
                      <span className="text-neutral-700">{item.specification}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-neutral-500">库存</span>
                      <span className="font-medium text-neutral-800">
                        {item.stock} {item.unit}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUse(item.id)}
                      disabled={item.stock <= 0}
                      className="flex-1 btn-primary btn-sm"
                    >
                      登记领用
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredConsumables.length === 0 && (
            <div className="card p-16 text-center">
              <div className="text-5xl mb-4">📦</div>
              <p className="text-neutral-500">未找到符合条件的耗材</p>
            </div>
          )}
        </>
      )}

      {activeTab === 'records' && (
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-neutral-100">
            <h3 className="font-semibold text-neutral-800 flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary-500" />
              我的领用记录
            </h3>
          </div>

          <div className="divide-y divide-neutral-100">
            {myRecords.map((record) => {
              const consumable = getConsumableById(record.consumableId);
              return (
                <div key={record.id} className="p-4 flex items-center justify-between hover:bg-neutral-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center">
                      <Package className="w-5 h-5 text-neutral-500" />
                    </div>
                    <div>
                      <p className="font-medium text-neutral-800">{consumable?.name}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-neutral-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(record.createdAt), 'yyyy-MM-dd HH:mm', {
                            locale: zhCN,
                          })}
                        </span>
                        {record.reservationId && (
                          <span className="text-primary-500">关联预约</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-primary-600">
                      -{record.quantity} {consumable?.unit}
                    </p>
                    {record.remark && (
                      <p className="text-xs text-neutral-400 mt-1">{record.remark}</p>
                    )}
                  </div>
                </div>
              );
            })}

            {myRecords.length === 0 && (
              <div className="p-16 text-center">
                <div className="text-5xl mb-4">📋</div>
                <p className="text-neutral-500">暂无领用记录</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 领用弹窗 */}
      <Modal isOpen={showUseModal} onClose={() => setShowUseModal(false)} title="登记耗材领用">
        <div className="space-y-4">
          {consumable && (
            <div className="p-4 bg-neutral-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-primary-50 flex items-center justify-center">
                  <Package className="w-6 h-6 text-primary-500" />
                </div>
                <div>
                  <p className="font-semibold text-neutral-800">{consumable.name}</p>
                  <p className="text-sm text-neutral-500">
                    库存：{consumable.stock} {consumable.unit}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              领用数量
            </label>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-10 h-10 rounded-lg border border-neutral-200 flex items-center justify-center hover:bg-neutral-50 transition-colors"
              >
                <Minus className="w-4 h-4 text-neutral-600" />
              </button>
              <div className="flex-1 text-center">
                <span className="text-2xl font-bold text-neutral-800">{quantity}</span>
                <span className="text-sm text-neutral-500 ml-1">
                  {consumable?.unit}
                </span>
              </div>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="w-10 h-10 rounded-lg border border-neutral-200 flex items-center justify-center hover:bg-neutral-50 transition-colors"
              >
                <Plus className="w-4 h-4 text-neutral-600" />
              </button>
            </div>
            {consumable && quantity > consumable.stock && (
              <p className="text-xs text-danger-500 mt-2 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                库存不足
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              关联预约（可选）
            </label>
            <select
              value={selectedReservation}
              onChange={(e) => setSelectedReservation(e.target.value)}
              className="select"
            >
              <option value="">不关联预约</option>
              {myReservations.map((r) => {
                const eq = getEquipmentById(r.equipmentId);
                return (
                  <option key={r.id} value={r.id}>
                    {eq?.name} - {format(new Date(r.startTime), 'MM-dd HH:mm', { locale: zhCN })}
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              备注
            </label>
            <textarea
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="请填写用途说明..."
              rows={2}
              className="textarea"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowUseModal(false)} className="btn-secondary">
              取消
            </button>
            <button
              onClick={handleSubmit}
              disabled={!consumable || quantity <= 0 || quantity > consumable.stock}
              className="btn-primary"
            >
              确认领用
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
