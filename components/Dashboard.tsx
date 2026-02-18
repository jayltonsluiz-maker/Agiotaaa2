
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, PieChart, Pie 
} from 'recharts';
import { 
  TrendingUp, Users, DollarSign, Clock, Wallet, 
  ChevronRight, User, ShieldAlert, X, Phone, FileText,
  ArrowUpRight, CheckCircle2, Receipt, Filter, Calendar,
  Activity, AlertCircle, Bell, BellRing, MessageCircle
} from 'lucide-react';
import { AppState, LoanStatus, Borrower, Payment, Loan } from '../types';
import { getRiskAssessment } from '../services/geminiService';

interface DashboardProps {
  state: AppState;
}

const StatCard = ({ title, value, subValue, icon: Icon, colorClass, gradient, badge, onClick }: any) => (
  <div 
    onClick={onClick}
    className={`bg-white p-7 rounded-[2.5rem] shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ${onClick ? 'cursor-pointer' : ''}`}
  >
    <div className={`absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 rounded-full opacity-10 group-hover:scale-110 transition-transform ${gradient}`} />
    
    {badge && (
      <div className="absolute top-6 right-8">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{badge}</span>
      </div>
    )}

    <div className="flex justify-between items-start mb-6 relative z-10">
      <div className={`p-4 rounded-2xl ${colorClass} shadow-lg shadow-current/20`}>
        <Icon size={24} className="text-white" />
      </div>
      {!badge && <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{title}</span>}
    </div>
    <div className="flex flex-col relative z-10">
      <span className="text-5xl font-black text-slate-800 tracking-tight">{value}</span>
      <span className="text-sm font-bold text-slate-400 mt-2">{subValue}</span>
    </div>
  </div>
);

export const Dashboard: React.FC<DashboardProps> = ({ state }) => {
  const navigate = useNavigate();
  const [selectedBorrower, setSelectedBorrower] = useState<Borrower | null>(null);
  const [isProfitModalOpen, setIsProfitModalOpen] = useState(false);
  const [isProjectedModalOpen, setIsProjectedModalOpen] = useState(false);
  const [yearFilter, setYearFilter] = useState<string>('ALL');
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);

  const calculatePMT = (P: number, i: number, n: number) => {
    if (i === 0) return P / n;
    return P * (i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1);
  };

  // Agenda de Cobrança Ativa (Vencimentos nos próximos 7 dias)
  const upcomingReminders = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const limit = new Date(today);
    limit.setDate(today.getDate() + 7);

    return state.loans.filter(l => l.status === LoanStatus.ACTIVE).map(loan => {
      const pmt = calculatePMT(loan.principalAmount, loan.monthlyInterestRate, loan.installments);
      const installmentsPaid = Math.floor(loan.totalPaid / pmt);
      const dueDate = new Date(loan.startDate);
      dueDate.setMonth(dueDate.getMonth() + installmentsPaid + 1);
      dueDate.setHours(0, 0, 0, 0);

      const diffTime = dueDate.getTime() - today.getTime();
      const daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return {
        loan,
        borrower: state.borrowers.find(b => b.id === loan.borrowerId),
        dueDate,
        daysUntil,
        pmtAmount: pmt
      };
    })
    .filter(item => item.daysUntil >= 0 && item.daysUntil <= 7)
    .sort((a, b) => a.daysUntil - b.daysUntil);
  }, [state.loans, state.borrowers]);

  const receivablesReport = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let ativos = 0;
    let atrasados = 0;
    let quitados = 0;

    state.loans.forEach(loan => {
      if (loan.status === LoanStatus.PAID) {
        quitados += loan.totalPaid;
      } else {
        const pmt = calculatePMT(loan.principalAmount, loan.monthlyInterestRate, loan.installments);
        const installmentsPaid = Math.floor(loan.totalPaid / pmt);
        const dueDate = new Date(loan.startDate);
        dueDate.setMonth(dueDate.getMonth() + installmentsPaid + 1);
        dueDate.setHours(0, 0, 0, 0);

        if (today > dueDate) atrasados += loan.remainingPrincipal;
        else ativos += loan.remainingPrincipal;
      }
    });

    const totalVolume = ativos + atrasados + quitados;
    return { 
      ativos, atrasados, quitados, totalVolume,
      ativosPercent: totalVolume > 0 ? (ativos / totalVolume) * 100 : 0,
      atrasadosPercent: totalVolume > 0 ? (atrasados / totalVolume) * 100 : 0,
      quitadosPercent: totalVolume > 0 ? (quitados / totalVolume) * 100 : 0
    };
  }, [state.loans]);

  const overdueCount = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return state.loans.filter(loan => {
      if (loan.status === LoanStatus.PAID) return false;
      const pmt = calculatePMT(loan.principalAmount, loan.monthlyInterestRate, loan.installments);
      const installmentsPaid = Math.floor(loan.totalPaid / pmt);
      const dueDate = new Date(loan.startDate);
      dueDate.setMonth(dueDate.getMonth() + installmentsPaid + 1);
      dueDate.setHours(0, 0, 0, 0);
      return today > dueDate;
    }).length;
  }, [state.loans]);

  const totalInMarket = state.loans.reduce((acc, curr) => acc + curr.remainingPrincipal, 0);
  const totalInterestEarned = state.loans.reduce((acc, curr) => {
      // Cálculo aproximado de juros já recebidos baseado na amortização total
      const ratio = curr.totalPaid / (curr.principalAmount + curr.accruedInterest);
      return acc + (curr.accruedInterest * ratio);
  }, 0);
  const totalProjectedInterest = state.loans.reduce((acc, curr) => acc + curr.accruedInterest, 0);
  const activeCount = state.loans.filter(l => l.status === LoanStatus.ACTIVE).length;

  const chartData = [
    { name: 'Capital Investido', valor: state.loans.reduce((acc, curr) => acc + curr.principalAmount, 0) },
    { name: 'Saldo na Rua', valor: totalInMarket },
    { name: 'Juros Realizados', valor: Math.max(0, totalInterestEarned) },
  ];

  const pieData = [
    { name: 'Ativos', value: activeCount, color: '#3b82f6' },
    { name: 'Em Atraso', value: overdueCount, color: '#ef4444' },
    { name: 'Quitados', value: state.loans.filter(l => l.status === LoanStatus.PAID).length, color: '#10b981' },
  ];

  const handleSendReminder = (item: typeof upcomingReminders[0]) => {
    if (!item.borrower?.phone) return;
    const phone = item.borrower.phone.replace(/\D/g, '');
    const dateStr = item.dueDate.toLocaleDateString('pt-BR');
    const msg = encodeURIComponent(`Olá ${item.borrower.name}, este é um lembrete amigável do CrediManager sobre sua próxima parcela de R$ ${item.pmtAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}, que vence no dia ${dateStr}. Se o pagamento já foi efetuado, por favor desconsidere esta mensagem. Obrigado!`);
    window.open(`https://wa.me/55${phone}?text=${msg}`, '_blank');
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Painel Executivo</h2>
          <p className="text-slate-400 font-bold mt-1">Gestão inteligente de recebíveis e risco.</p>
        </div>
        {upcomingReminders.length > 0 && (
          <div className="bg-amber-100 text-amber-700 px-5 py-2.5 rounded-2xl flex items-center gap-3 animate-bounce shadow-sm">
            <BellRing size={20} className="animate-pulse" />
            <span className="text-xs font-black uppercase tracking-widest">{upcomingReminders.length} Cobranças Próximas</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <StatCard title="Saldo na Rua" value={`R$ ${totalInMarket.toLocaleString()}`} subValue="Pendente de Recebimento" icon={Wallet} colorClass="bg-blue-600" gradient="bg-blue-500" onClick={() => navigate('/loans')} />
        <StatCard title="Rentabilidade" value={`R$ ${Math.max(0, totalInterestEarned).toLocaleString()}`} subValue="Lucro Realizado" icon={TrendingUp} colorClass="bg-emerald-500" gradient="bg-emerald-400" onClick={() => setIsProfitModalOpen(true)} />
        <StatCard title="Clientes" value={state.borrowers.length} subValue="Base Total" icon={Users} colorClass="bg-indigo-500" gradient="bg-indigo-400" onClick={() => navigate('/borrowers')} />
        <StatCard title="Inadimplência" value={overdueCount} subValue="Contratos em Atraso" badge="ALERTA DE RISCO" icon={Clock} colorClass="bg-rose-500" gradient="bg-rose-400" onClick={() => navigate('/overdue')} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-10">
          
          {/* Agenda de Cobrança / Lembretes */}
          <section className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden relative">
            <h3 className="text-xl font-black text-slate-800 mb-8 flex items-center gap-3">
              <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl shadow-inner">
                <Calendar size={20} />
              </div>
              Agenda de Recebimentos (Próximos 7 dias)
            </h3>
            
            {upcomingReminders.length > 0 ? (
              <div className="space-y-4">
                {upcomingReminders.map((item, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-center justify-between p-5 rounded-3xl bg-slate-50 border border-transparent hover:border-blue-200 hover:bg-white transition-all group shadow-sm hover:shadow-md"
                  >
                    <div className="flex items-center gap-5">
                      <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-black shadow-sm ${
                        item.daysUntil === 0 ? 'bg-amber-100 text-amber-700' : 'bg-blue-50 text-blue-600'
                      }`}>
                        <span className="text-[10px] uppercase leading-none mb-1">{item.daysUntil === 0 ? 'Hoje' : 'Em'}</span>
                        <span className="text-lg">{item.daysUntil === 0 ? '!' : `${item.daysUntil}d`}</span>
                      </div>
                      <div>
                        <p className="text-base font-black text-slate-800">{item.borrower?.name}</p>
                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                          Parcela R$ {item.pmtAmount.toLocaleString(undefined, {minimumFractionDigits: 2})} • Vence {item.dueDate.toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleSendReminder(item)}
                      className="opacity-0 group-hover:opacity-100 bg-emerald-500 text-white px-5 py-3 rounded-2xl hover:bg-emerald-600 transition-all flex items-center gap-2 font-bold shadow-lg shadow-emerald-100"
                    >
                      <MessageCircle size={18} />
                      <span className="text-xs">Lembrar WhatsApp</span>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-14 bg-slate-50/50 rounded-[2rem] border-2 border-dashed border-slate-100">
                <CheckCircle2 size={48} className="mx-auto text-slate-200 mb-4" />
                <p className="text-slate-400 font-bold italic">Nenhum vencimento previsto para a próxima semana.</p>
              </div>
            )}
          </section>

          <section className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none"><Activity size={200} /></div>
            <div className="relative z-10">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                <div>
                  <h3 className="text-2xl font-black flex items-center gap-3"><Receipt className="text-blue-400" />Saúde Financeira</h3>
                  <p className="text-slate-400 font-bold mt-1 uppercase text-[10px] tracking-widest">Distribuição do Capital</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Em Dia (Ativos)</p>
                    <span className="text-xs font-black">{receivablesReport.ativosPercent.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500" style={{ width: `${receivablesReport.ativosPercent}%` }} />
                  </div>
                  <p className="text-sm font-bold text-slate-400">R$ {receivablesReport.ativos.toLocaleString()}</p>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Inadimplentes</p>
                    <span className="text-xs font-black">{receivablesReport.atrasadosPercent.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-500" style={{ width: `${receivablesReport.atrasadosPercent}%` }} />
                  </div>
                  <p className="text-sm font-bold text-slate-400">R$ {receivablesReport.atrasados.toLocaleString()}</p>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Amortizados</p>
                    <span className="text-xs font-black">{receivablesReport.quitadosPercent.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: `${receivablesReport.quitadosPercent}%` }} />
                  </div>
                  <p className="text-sm font-bold text-slate-400">R$ {receivablesReport.quitados.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-10">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col">
            <h3 className="text-xl font-black text-slate-800 mb-8 flex items-center gap-3">
              <div className="w-2 h-8 bg-indigo-600 rounded-full" />Status da Carteira
            </h3>
            <div className="h-64 w-full flex-1 relative">
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-4xl font-black text-slate-800">{state.loans.length}</span>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contratos</span>
              </div>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={pieData} 
                    cx="50%" cy="50%" 
                    innerRadius={75} 
                    outerRadius={95} 
                    paddingAngle={8} 
                    dataKey="value" 
                    stroke="none"
                  >
                    {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
             <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
               <DollarSign size={20} className="text-emerald-500" /> Alocação de Capital
             </h3>
             <div className="h-60 w-full">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={chartData} margin={{ left: -20 }}>
                   <XAxis dataKey="name" hide />
                   <YAxis hide />
                   <Tooltip />
                   <Bar dataKey="valor" radius={10} barSize={40}>
                     {chartData.map((e, i) => <Cell key={`c-${i}`} fill={i === 2 ? '#10b981' : '#3b82f6'} />)}
                   </Bar>
                 </BarChart>
               </ResponsiveContainer>
             </div>
          </div>
        </div>
      </div>

      {isProfitModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-2xl p-10 shadow-2xl relative animate-in zoom-in-95 duration-300">
            <button onClick={() => setIsProfitModalOpen(false)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-600"><X size={24} /></button>
            <div className="mb-10 text-center">
              <TrendingUp size={48} className="mx-auto text-emerald-500 mb-4" />
              <h3 className="text-3xl font-black text-slate-800">Rentabilidade da Operação</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
              <div className="bg-emerald-50 p-8 rounded-[2rem] border border-emerald-100 text-center">
                <p className="text-4xl font-black text-emerald-600">R$ {Math.max(0, totalInterestEarned).toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                <p className="text-[10px] text-emerald-700 font-black uppercase mt-3 tracking-widest">Juros Realizados (Recebidos)</p>
              </div>
              <div className="bg-blue-50 p-8 rounded-[2rem] border border-blue-100 text-center">
                <p className="text-4xl font-black text-blue-600">R$ {totalProjectedInterest.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                <p className="text-[10px] text-blue-700 font-black uppercase mt-3 tracking-widest">Juros Projetados (Total Contratos)</p>
              </div>
            </div>
            <p className="text-center text-slate-400 text-xs font-medium">Os valores realizados são calculados proporcionalmente ao valor amortizado por contrato.</p>
          </div>
        </div>
      )}
    </div>
  );
};
