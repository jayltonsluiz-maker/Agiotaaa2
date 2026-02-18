
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, AlertTriangle, MessageCircle, Clock, ChevronRight,
  ShieldAlert, DollarSign, AlertCircle
} from 'lucide-react';
import { AppState, LoanStatus, Loan, Payment, Borrower } from '../types';

interface OverdueProps {
  state: AppState;
  onAddLoan: (l: Loan) => void;
  onAddPayment: (p: Payment) => void;
  onUpdatePayment: (p: Payment) => void;
  onDeletePayment: (id: string) => void;
  onDeleteLoan: (id: string) => void;
  onUpdateLoan: (l: Loan) => void;
}

export const Overdue: React.FC<OverdueProps> = ({ state, onAddLoan, onAddPayment, onUpdatePayment, onDeletePayment, onDeleteLoan, onUpdateLoan }) => {
  const navigate = useNavigate();
  
  const calculatePMT = (P: number, i: number, n: number) => {
    if (i === 0) return P / n;
    return P * (i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1);
  };

  const overdueInfo = useMemo(() => {
    return state.loans.map(loan => {
      const pmt = calculatePMT(loan.principalAmount, loan.monthlyInterestRate, loan.installments);
      const installmentsPaid = Math.floor(loan.totalPaid / pmt);
      
      const dueDate = new Date(loan.startDate);
      dueDate.setMonth(dueDate.getMonth() + installmentsPaid + 1);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      dueDate.setHours(0, 0, 0, 0);

      const diffTime = today.getTime() - dueDate.getTime();
      const daysLate = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

      return {
        loan,
        daysLate,
        dueDate,
        pmtValue: pmt,
        isOverdue: daysLate >= 1 && loan.status !== LoanStatus.PAID
      };
    }).filter(item => item.isOverdue).sort((a, b) => b.daysLate - a.daysLate);
  }, [state.loans]);

  const stats = useMemo(() => {
    const count = overdueInfo.length;
    return { count };
  }, [overdueInfo]);

  const getBorrower = (id: string) => state.borrowers.find(b => b.id === id);

  const handleWhatsApp = (borrower: Borrower | undefined, loan: Loan, days: number) => {
    if (!borrower) return;
    const phone = borrower.emergencyContacts[0]?.phone.replace(/\D/g, '');
    const message = encodeURIComponent(
      `Olá ${borrower.name}, identificamos que sua parcela de R$ ${calculatePMT(loan.principalAmount, loan.monthlyInterestRate, loan.installments).toLocaleString(undefined, {minimumFractionDigits: 2})} está vencida há ${days} ${days === 1 ? 'dia' : 'dias'}. Podemos conversar sobre a regularização?`
    );
    window.open(`https://wa.me/55${phone}?text=${message}`, '_blank');
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      <div className="flex items-center justify-between">
        <button 
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-slate-400 hover:text-slate-800 transition-colors group"
        >
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-bold">Voltar para Painel</span>
        </button>
      </div>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-4">
            Alertas de Inadimplência
            <div className={`p-2 rounded-2xl ${stats.count > 0 ? 'bg-rose-100 text-rose-600 animate-pulse' : 'bg-emerald-100 text-emerald-600'}`}>
              <AlertTriangle size={24} />
            </div>
          </h2>
          <p className="text-slate-400 font-bold mt-2">Monitoramento de contratos vencidos a partir de 24 horas.</p>
        </div>
      </div>

      {overdueInfo.length > 0 ? (
        <div className="space-y-6">
          <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
            <div className="w-2 h-8 bg-rose-500 rounded-full" />
            Lista de Contratos em Atraso ({overdueInfo.length})
          </h3>
          
          <div className="grid grid-cols-1 gap-4">
            {overdueInfo.map(({ loan, daysLate, dueDate, pmtValue }) => {
              const borrower = getBorrower(loan.borrowerId);
              const isVeryCritical = daysLate > 30;
              const isModerate = daysLate > 7 && daysLate <= 30;

              return (
                <div key={loan.id} className={`bg-white p-6 rounded-[2rem] border transition-all flex flex-col lg:flex-row gap-6 items-center ${
                  isVeryCritical 
                    ? 'border-rose-200 shadow-lg shadow-rose-50 ring-1 ring-rose-100' 
                    : 'border-slate-100 shadow-sm hover:shadow-md'
                }`}>
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black shrink-0 ${
                    isVeryCritical ? 'bg-rose-600 text-white' : 
                    isModerate ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {borrower?.name.charAt(0)}
                  </div>

                  <div className="flex-1 w-full">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-lg font-black text-slate-800">{borrower?.name}</h4>
                          {isVeryCritical && (
                            <span className="flex items-center gap-1 bg-rose-100 text-rose-600 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter animate-pulse">
                              <AlertCircle size={10} /> Recuperação Crítica
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Vencido em {dueDate.toLocaleDateString('pt-BR')}</p>
                      </div>
                      <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm ${
                        isVeryCritical ? 'bg-rose-600 text-white' : 
                        isModerate ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {daysLate} {daysLate === 1 ? 'dia' : 'dias'} de atraso
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-slate-50 p-3 rounded-2xl border border-transparent hover:border-slate-200 transition-colors">
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Parcela Vencida</p>
                        <p className="text-sm font-black text-rose-600">R$ {pmtValue.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-2xl border border-transparent hover:border-slate-200 transition-colors">
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Saldo Total</p>
                        <p className="text-sm font-black text-slate-800">R$ {loan.remainingPrincipal.toLocaleString()}</p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-2xl border border-transparent hover:border-slate-200 transition-colors">
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Score</p>
                        <p className={`text-sm font-black ${borrower && borrower.score < 40 ? 'text-rose-500' : 'text-slate-800'}`}>
                          {borrower?.score}/100
                        </p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-2xl border border-transparent hover:border-slate-200 transition-colors">
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Contato</p>
                        <p className="text-sm font-black text-slate-800 truncate">{borrower?.emergencyContacts[0]?.phone}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex lg:flex-col gap-2 w-full lg:w-48 shrink-0">
                    <button 
                      onClick={() => handleWhatsApp(borrower, loan, daysLate)}
                      className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all text-xs shadow-lg shadow-emerald-50"
                    >
                      <MessageCircle size={18} />
                      Cobrar WhatsApp
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-emerald-50 border border-emerald-100 p-20 rounded-[3rem] text-center shadow-inner relative overflow-hidden group">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-200/20 rounded-full scale-0 group-hover:scale-100 transition-transform duration-1000" />
          <div className="relative z-10">
            <div className="bg-emerald-500 w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto mb-8 text-white shadow-2xl shadow-emerald-200">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
            <h3 className="text-3xl font-black text-emerald-900 mb-4">Portfólio Saudável!</h3>
            <p className="text-emerald-700 font-bold max-w-lg mx-auto leading-relaxed">
              Nenhum contrato em atraso superior a 24 horas. Continue mantendo esse padrão de excelência na sua operação.
            </p>
            <button 
              onClick={() => navigate('/loans')}
              className="mt-10 bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black text-lg hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 flex items-center gap-3 mx-auto"
            >
              Ver Carteira <ChevronRight />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
