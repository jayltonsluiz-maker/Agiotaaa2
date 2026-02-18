
import React, { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loan, LoanStatus, Payment, AppState, Borrower } from '../types';
import { 
  Calendar, DollarSign, History, ChevronRight, X, Trash2, Edit3, 
  PlusCircle, ArrowUpRight, ArrowLeft, Calculator, Receipt, 
  AlertTriangle, Clock, Paperclip, FileText, Eye, MessageCircle,
  Bell, BellRing
} from 'lucide-react';

interface LoansProps {
  state: AppState;
  onAddLoan: (l: Loan) => void;
  onAddPayment: (p: Payment) => void;
  onUpdatePayment: (p: Payment) => void;
  onDeletePayment: (id: string) => void;
  onDeleteLoan: (id: string) => void;
  onUpdateLoan: (l: Loan) => void;
}

export const Loans: React.FC<LoansProps> = ({ state, onAddLoan, onAddPayment, onUpdatePayment, onDeletePayment, onDeleteLoan, onUpdateLoan }) => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<LoanStatus | 'ALL'>('ALL');
  const [selectedLoanForPayment, setSelectedLoanForPayment] = useState<Loan | null>(null);
  const [viewHistoryLoan, setViewHistoryLoan] = useState<Loan | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLoanId, setEditingLoanId] = useState<string | null>(null);

  const [loanForm, setLoanForm] = useState({
    borrowerId: '',
    principalAmount: '',
    monthlyInterestRate: '',
    installments: '',
    startDate: new Date().toISOString().split('T')[0],
    contractUrl: ''
  });

  const getBorrower = (id: string) => state.borrowers.find(b => b.id === id);
  const getBorrowerName = (id: string) => getBorrower(id)?.name || 'Desconhecido';

  const calculatePMT = (P: number, i: number, n: number) => {
    if (i === 0) return P / n;
    return P * (i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1);
  };

  const getNextDueDate = (loan: Loan) => {
    const pmt = calculatePMT(loan.principalAmount, loan.monthlyInterestRate, loan.installments);
    const installmentsPaid = Math.floor(loan.totalPaid / pmt);
    const date = new Date(loan.startDate);
    date.setMonth(date.getMonth() + installmentsPaid + 1);
    date.setHours(0, 0, 0, 0);
    return date;
  };

  const handleWhatsApp = (borrower: Borrower | undefined, loan: Loan, type: 'REMINDER' | 'GENERIC' = 'GENERIC', nextDueDate?: Date) => {
    if (!borrower || !borrower.phone) return;
    const phone = borrower.phone.replace(/\D/g, '');
    const pmt = calculatePMT(loan.principalAmount, loan.monthlyInterestRate, loan.installments);
    
    let message = "";
    if (type === 'REMINDER' && nextDueDate) {
      message = encodeURIComponent(
        `Olá ${borrower.name}, este é um lembrete amigável sobre sua próxima parcela de R$ ${pmt.toLocaleString(undefined, {minimumFractionDigits: 2})}, que vence no dia ${nextDueDate.toLocaleDateString('pt-BR')}. Se já pagou, favor desconsiderar. Obrigado!`
      );
    } else {
      message = encodeURIComponent(
        `Olá ${borrower.name}, gostaria de falar sobre seu contrato no valor de R$ ${loan.principalAmount.toLocaleString()}. Tudo bem com você?`
      );
    }
    
    window.open(`https://wa.me/55${phone}?text=${message}`, '_blank');
  };

  const filtered = activeTab === 'ALL' 
    ? state.loans 
    : state.loans.filter(l => l.status === activeTab);

  const handleOpenCreate = () => {
    setEditingLoanId(null);
    setLoanForm({
      borrowerId: '',
      principalAmount: '',
      monthlyInterestRate: '',
      installments: '',
      startDate: new Date().toISOString().split('T')[0],
      contractUrl: ''
    });
    setIsModalOpen(true);
  };

  const handleSubmitLoan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loanForm.borrowerId || !loanForm.principalAmount) return;

    const principal = parseFloat(loanForm.principalAmount);
    const rate = parseFloat(loanForm.monthlyInterestRate || '0') / 100;
    const installmentsCount = parseInt(loanForm.installments || '1');
    const pmt = calculatePMT(principal, rate, installmentsCount);
    const totalContractValue = pmt * installmentsCount;
    const totalProjectedInterest = totalContractValue - principal;

    if (editingLoanId) {
      const original = state.loans.find(l => l.id === editingLoanId);
      if (original) {
        onUpdateLoan({
          ...original,
          borrowerId: loanForm.borrowerId,
          principalAmount: principal,
          monthlyInterestRate: rate,
          startDate: loanForm.startDate,
          installments: installmentsCount,
          accruedInterest: totalProjectedInterest,
          remainingPrincipal: Math.max(0, totalContractValue - original.totalPaid)
        });
      }
    } else {
      const l: Loan = {
        id: Math.random().toString(36).substr(2, 9),
        borrowerId: loanForm.borrowerId,
        principalAmount: principal,
        monthlyInterestRate: rate,
        startDate: loanForm.startDate || new Date().toISOString().split('T')[0],
        installments: installmentsCount,
        status: LoanStatus.ACTIVE,
        remainingPrincipal: totalContractValue,
        accruedInterest: totalProjectedInterest,
        totalPaid: 0
      };
      onAddLoan(l);
    }
    setIsModalOpen(false);
  };

  const handleAddPayment = () => {
    if (!selectedLoanForPayment || !paymentAmount) return;
    const newPayment: Payment = {
      id: Math.random().toString(36).substr(2, 9),
      loanId: selectedLoanForPayment.id,
      amount: parseFloat(paymentAmount),
      date: new Date().toISOString().split('T')[0],
      type: 'TOTAL',
      notes: paymentNotes
    };
    onAddPayment(newPayment);
    setSelectedLoanForPayment(null);
    setPaymentAmount('');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <button onClick={() => navigate('/')} className="flex items-center gap-2 text-slate-400 hover:text-slate-800 mb-2 group">
        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
        <span className="text-sm font-bold">Voltar para Painel</span>
      </button>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Contratos de Empréstimo</h2>
          <p className="text-slate-500">Gestão de parcelas e lembretes automáticos de vencimento.</p>
        </div>
        <button 
          onClick={handleOpenCreate}
          className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
        >
          <PlusCircle size={18} />
          Nova Concessão
        </button>
      </div>

      <div className="flex bg-slate-200/50 p-1 rounded-xl w-fit">
        {(['ALL', LoanStatus.ACTIVE, LoanStatus.OVERDUE, LoanStatus.PAID] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === tab 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab === 'ALL' ? 'Todos' : tab === LoanStatus.ACTIVE ? 'Ativos' : tab === LoanStatus.OVERDUE ? 'Atrasados' : 'Quitados'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filtered.map(loan => {
          const pmtValue = calculatePMT(loan.principalAmount, loan.monthlyInterestRate, loan.installments);
          const borrower = getBorrower(loan.borrowerId);
          const nextDue = getNextDueDate(loan);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          const diffTime = nextDue.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          const needsReminder = loan.status === LoanStatus.ACTIVE && diffDays >= 0 && diffDays <= 3;

          return (
            <div key={loan.id} className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm hover:shadow-md transition-all flex flex-col xl:flex-row xl:items-center gap-6 relative overflow-hidden group">
              <div className={`absolute top-0 left-0 w-1.5 h-full ${
                loan.status === LoanStatus.ACTIVE ? 'bg-blue-500' :
                loan.status === LoanStatus.OVERDUE ? 'bg-rose-500' : 'bg-emerald-500'
              }`} />
              
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <h3 className="text-lg font-bold text-slate-800">{borrower?.name}</h3>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest ${
                    loan.status === LoanStatus.ACTIVE ? 'bg-blue-50 text-blue-600' :
                    loan.status === LoanStatus.OVERDUE ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
                  }`}>
                    {loan.status}
                  </span>
                  
                  {needsReminder && (
                    <button 
                      onClick={() => handleWhatsApp(borrower, loan, 'REMINDER', nextDue)}
                      className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[10px] font-black flex items-center gap-2 animate-pulse hover:bg-amber-200 transition-colors"
                    >
                      <BellRing size={12} />
                      {diffDays === 0 ? 'VENCE HOJE' : `VENCE EM ${diffDays} DIAS`} • LEMBRAR
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Parcela Fixa</p>
                    <p className="text-sm font-black text-blue-600">R$ {pmtValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Saldo Devedor</p>
                    <p className="text-lg font-black text-rose-600">R$ {loan.remainingPrincipal.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Próximo Vencimento</p>
                    <p className="text-xs font-bold text-slate-500">{nextDue.toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-4 xl:pt-0 border-t xl:border-t-0 border-slate-50">
                <button 
                  onClick={() => setViewHistoryLoan(loan)}
                  className="p-3 rounded-2xl bg-slate-50 text-slate-500 hover:bg-slate-100 transition-colors"
                >
                  <History size={20} />
                </button>
                <button 
                  onClick={() => { setSelectedLoanForPayment(loan); setPaymentAmount(pmtValue.toFixed(2)); }}
                  className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg flex items-center gap-2"
                >
                  Amortizar <ChevronRight size={18} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Lançar Pagamento */}
      {selectedLoanForPayment && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
           <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl relative animate-in zoom-in-95">
             <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold text-slate-800">Registrar Recebimento</h3>
                <button onClick={() => setSelectedLoanForPayment(null)} className="text-slate-400 hover:text-slate-600"><X /></button>
             </div>
             <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2 uppercase">Valor Recebido (R$)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    className="w-full px-4 py-4 rounded-2xl border border-slate-700 bg-slate-900 text-white text-2xl font-black text-center outline-none"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                  />
                </div>
                <button 
                  onClick={handleAddPayment}
                  className="w-full py-4 rounded-2xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-xl transition-all"
                >
                  Confirmar Pagamento
                </button>
             </div>
           </div>
        </div>
      )}

      {/* Modal Criar Contrato */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg p-8 shadow-2xl relative animate-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center mb-8">
               <h3 className="text-2xl font-bold text-slate-900">Novo Empréstimo</h3>
               <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X /></button>
            </div>
            <form onSubmit={handleSubmitLoan} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Selecione o Cliente</label>
                <select 
                  required 
                  className="w-full px-4 py-3 rounded-xl border border-slate-700 bg-slate-900 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  value={loanForm.borrowerId}
                  onChange={(e) => setLoanForm({...loanForm, borrowerId: e.target.value})}
                >
                  <option value="">Escolha um cliente...</option>
                  {state.borrowers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Capital (R$)</label>
                  <input 
                    required type="number" 
                    className="w-full px-4 py-3 rounded-xl border border-slate-700 bg-slate-900 text-white"
                    value={loanForm.principalAmount}
                    onChange={(e) => setLoanForm({...loanForm, principalAmount: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Juros Mensais (%)</label>
                  <input 
                    required type="number" step="0.1"
                    className="w-full px-4 py-3 rounded-xl border border-slate-700 bg-slate-900 text-white"
                    value={loanForm.monthlyInterestRate}
                    onChange={(e) => setLoanForm({...loanForm, monthlyInterestRate: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Parcelas</label>
                  <input 
                    required type="number" 
                    className="w-full px-4 py-3 rounded-xl border border-slate-700 bg-slate-900 text-white"
                    value={loanForm.installments}
                    onChange={(e) => setLoanForm({...loanForm, installments: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Data Início</label>
                  <input 
                    required type="date"
                    className="w-full px-4 py-3 rounded-xl border border-slate-700 bg-slate-900 text-white"
                    value={loanForm.startDate}
                    onChange={(e) => setLoanForm({...loanForm, startDate: e.target.value})}
                  />
                </div>
              </div>
              <button type="submit" className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-emerald-700 shadow-lg shadow-emerald-50 mt-4 transition-all">
                Concluir Contrato
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Histórico Rápido */}
      {viewHistoryLoan && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-md p-8 shadow-2xl relative animate-in zoom-in-95">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-800">Pagamentos: {getBorrowerName(viewHistoryLoan.borrowerId)}</h3>
                <button onClick={() => setViewHistoryLoan(null)} className="text-slate-400 hover:text-slate-600"><X /></button>
             </div>
             <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                {state.payments.filter(p => p.loanId === viewHistoryLoan.id).length > 0 ? (
                  state.payments.filter(p => p.loanId === viewHistoryLoan.id).reverse().map(p => (
                    <div key={p.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div>
                        <p className="text-sm font-black text-slate-800">R$ {p.amount.toLocaleString()}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{new Date(p.date).toLocaleDateString('pt-BR')}</p>
                      </div>
                      <div className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-lg text-[10px] font-black uppercase">Recebido</div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 text-slate-400 font-bold italic">Nenhum pagamento registrado.</div>
                )}
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
