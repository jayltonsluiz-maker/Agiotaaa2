
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Borrower, EmergencyContact, Loan, Payment, LoanStatus } from '../types';
import { 
  UserPlus, Search, Edit3, Trash2, ShieldAlert, FileText, 
  Phone, X, User, ArrowLeft, Paperclip, Eye, CheckCircle,
  History, Receipt, TrendingUp, Calendar, CreditCard, Mail
} from 'lucide-react';
import { getRiskAssessment } from '../services/geminiService';

interface BorrowersProps {
  borrowers: Borrower[];
  loans: Loan[];
  payments: Payment[];
  onAdd: (b: Borrower) => void;
  onUpdate: (b: Borrower) => void;
  onDelete: (id: string) => void;
}

export const Borrowers: React.FC<BorrowersProps> = ({ borrowers, loans, payments, onAdd, onUpdate, onDelete }) => {
  const navigate = useNavigate();
  const idInputRef = useRef<HTMLInputElement>(null);
  const addressInputRef = useRef<HTMLInputElement>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedHistoryBorrower, setSelectedHistoryBorrower] = useState<Borrower | null>(null);
  const [search, setSearch] = useState('');
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [editingBorrowerId, setEditingBorrowerId] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<Borrower>>({
    name: '',
    cpf: '',
    phone: '',
    email: '',
    address: '',
    score: 50,
    emergencyContacts: [{ name: '', relation: '', phone: '' }],
    idPhotoUrl: '',
    addressProofUrl: ''
  });

  const formatPhone = (value: string) => {
    if (!value) return value;
    const phoneNumber = value.replace(/[^\d]/g, '');
    const phoneNumberLength = phoneNumber.length;
    if (phoneNumberLength <= 2) return `(${phoneNumber}`;
    if (phoneNumberLength <= 6) return `(${phoneNumber.slice(0, 2)}) ${phoneNumber.slice(2)}`;
    if (phoneNumberLength <= 10) return `(${phoneNumber.slice(0, 2)}) ${phoneNumber.slice(2, 6)}-${phoneNumber.slice(6)}`;
    return `(${phoneNumber.slice(0, 2)}) ${phoneNumber.slice(2, 7)}-${phoneNumber.slice(7, 11)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedValue = formatPhone(e.target.value);
    setFormData({ ...formData, phone: formattedValue });
  };

  const filtered = borrowers.filter(b => 
    b.name.toLowerCase().includes(search.toLowerCase()) || 
    b.cpf.includes(search) ||
    b.phone?.includes(search)
  );

  const handleAiAnalysis = async (borrower: Borrower) => {
    setIsLoadingAi(true);
    const analysis = await getRiskAssessment(borrower, loans.filter(l => l.borrowerId === borrower.id));
    setAiAnalysis(analysis);
    setIsLoadingAi(false);
  };

  const handleOpenCreate = () => {
    setEditingBorrowerId(null);
    setFormData({ 
      name: '', 
      cpf: '', 
      phone: '',
      email: '',
      address: '', 
      score: 50, 
      emergencyContacts: [{ name: '', relation: '', phone: '' }],
      idPhotoUrl: '',
      addressProofUrl: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (borrower: Borrower) => {
    setEditingBorrowerId(borrower.id);
    setFormData({
      ...borrower,
      emergencyContacts: borrower.emergencyContacts.length > 0 
        ? borrower.emergencyContacts 
        : [{ name: '', relation: '', phone: '' }]
    });
    setIsModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'idPhotoUrl' | 'addressProofUrl') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, [field]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingBorrowerId) {
      onUpdate({ ...formData, id: editingBorrowerId } as Borrower);
    } else {
      onAdd({ ...formData, score: 50 } as Borrower);
    }
    setIsModalOpen(false);
    setEditingBorrowerId(null);
  };

  const openAttachment = (url: string) => {
    const win = window.open();
    if (win) {
      win.document.write(`<iframe src="${url}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
    }
  };

  const calculateLoanPmt = (loan: Loan) => {
    const P = loan.principalAmount;
    const i = loan.monthlyInterestRate;
    const n = loan.installments;
    if (i === 0) return P / n;
    return P * (i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <button 
        onClick={() => navigate('/')}
        className="flex items-center gap-2 text-slate-400 hover:text-slate-800 transition-colors mb-2 group"
      >
        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
        <span className="text-sm font-bold">Voltar para Painel</span>
      </button>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Cadastro de Clientes</h2>
          <p className="text-slate-500">Gestão centralizada de perfis e score de crédito automático.</p>
        </div>
        <button 
          onClick={handleOpenCreate}
          className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
        >
          <UserPlus size={18} />
          Novo Cliente
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input 
          type="text" 
          placeholder="Buscar cliente por nome, CPF ou Telefone..."
          className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-slate-900 text-white placeholder-slate-500 font-medium"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(borrower => (
          <div 
            key={borrower.id} 
            className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col group relative"
          >
            <div 
              className="absolute inset-0 cursor-pointer z-0" 
              onClick={() => setSelectedHistoryBorrower(borrower)}
            />
            
            <div className="flex justify-between items-start mb-4 relative z-10 pointer-events-none">
              <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                <User size={24} />
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={`text-xs px-2.5 py-1 rounded-lg font-bold ${
                  borrower.score > 70 ? 'bg-emerald-50 text-emerald-700' : 
                  borrower.score > 40 ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'
                }`}>
                  Score: {borrower.score}
                </span>
              </div>
            </div>
            
            <h3 className="text-lg font-bold text-slate-800 group-hover:text-blue-600 transition-colors relative z-10 pointer-events-none">{borrower.name}</h3>
            <p className="text-sm font-medium text-slate-400 mb-4 relative z-10 pointer-events-none">{borrower.cpf}</p>
            
            <div className="space-y-3 mb-6 flex-1 relative z-10 pointer-events-none">
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <Phone size={16} className="text-blue-500 shrink-0" />
                <span>{borrower.phone || 'Sem telefone'}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <Mail size={16} className="text-indigo-500 shrink-0" />
                <span className="truncate">{borrower.email || 'Sem e-mail'}</span>
              </div>
              <div className="flex items-start gap-3 text-sm text-slate-500">
                <FileText size={16} className="text-slate-300 mt-0.5 shrink-0" />
                <span className="line-clamp-1">{borrower.address}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-4 border-t border-slate-50 relative z-10">
              <button 
                onClick={(e) => { e.stopPropagation(); handleAiAnalysis(borrower); }}
                disabled={isLoadingAi}
                className="flex-1 text-blue-600 text-xs font-bold py-2 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
              >
                <ShieldAlert size={14} />
                {isLoadingAi ? 'Analisando...' : 'IA Risco'}
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); handleOpenEdit(borrower); }}
                className="p-2 text-slate-400 hover:text-blue-600 transition-colors bg-slate-50 rounded-lg"
              >
                <Edit3 size={18} />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); onDelete(borrower.id); }}
                className="p-2 text-slate-400 hover:text-rose-600 transition-colors bg-slate-50 rounded-lg"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {selectedHistoryBorrower && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-4xl p-10 shadow-2xl relative animate-in slide-in-from-bottom-8 duration-500 overflow-y-auto max-h-[90vh]">
            <button 
              onClick={() => setSelectedHistoryBorrower(null)}
              className="absolute top-8 right-8 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={24} />
            </button>

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-blue-100 text-blue-600 rounded-[1.5rem] shadow-sm">
                    <History size={28} />
                  </div>
                  <div>
                    <h3 className="text-3xl font-black text-slate-800">Histórico Financeiro</h3>
                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">{selectedHistoryBorrower.name}</p>
                  </div>
                </div>
                <div className="flex gap-6 pl-2">
                   <div className="flex items-center gap-2 text-slate-500 text-sm font-bold">
                     <Phone size={14} className="text-blue-500" /> {selectedHistoryBorrower.phone}
                   </div>
                   <div className="flex items-center gap-2 text-slate-500 text-sm font-bold">
                     <Mail size={14} className="text-indigo-500" /> {selectedHistoryBorrower.email}
                   </div>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="bg-slate-50 px-6 py-3 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Score Atual</p>
                  <p className={`text-2xl font-black ${selectedHistoryBorrower.score > 70 ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {selectedHistoryBorrower.score}/100
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-10">
              {loans.filter(l => l.borrowerId === selectedHistoryBorrower.id).length > 0 ? (
                loans.filter(l => l.borrowerId === selectedHistoryBorrower.id).reverse().map((loan) => {
                  const loanPayments = payments.filter(p => p.loanId === loan.id).reverse();
                  const pmt = calculateLoanPmt(loan);
                  
                  return (
                    <div key={loan.id} className="bg-slate-50 border border-slate-100 rounded-[2.5rem] overflow-hidden shadow-sm">
                      <div className="p-8 bg-white border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="space-y-1">
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black bg-blue-600 text-white px-3 py-1 rounded-full uppercase tracking-widest">Contrato #{loan.id.split('-')[0]}</span>
                            <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${
                              loan.status === LoanStatus.PAID ? 'bg-emerald-100 text-emerald-700' : 
                              loan.status === LoanStatus.OVERDUE ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {loan.status === LoanStatus.PAID ? 'Quitado' : loan.status === LoanStatus.OVERDUE ? 'Atrasado' : 'Ativo'}
                            </span>
                          </div>
                          <h4 className="text-lg font-black text-slate-800 flex items-center gap-2">
                            <TrendingUp size={18} className="text-blue-500" />
                            R$ {(loan.principalAmount + loan.accruedInterest).toLocaleString()}
                          </h4>
                          <p className="text-xs text-slate-400 font-bold flex items-center gap-1">
                            <Calendar size={12} /> Início: {new Date(loan.startDate).toLocaleDateString('pt-BR')}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                          <div className="text-center md:text-left">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Principal</p>
                            <p className="text-sm font-bold text-slate-700">R$ {loan.principalAmount.toLocaleString()}</p>
                          </div>
                          <div className="text-center md:text-left">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Parcelas</p>
                            <p className="text-sm font-bold text-slate-700">{loan.installments}x R$ {pmt.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                          </div>
                          <div className="text-center md:text-left col-span-2 md:col-span-1 border-t md:border-t-0 pt-4 md:pt-0">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Saldo Devedor</p>
                            <p className="text-lg font-black text-rose-600">R$ {loan.remainingPrincipal.toLocaleString()}</p>
                          </div>
                        </div>
                      </div>

                      <div className="p-8">
                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                          <Receipt size={14} className="text-emerald-500" />
                          Fluxo de Amortização ({loanPayments.length})
                        </h5>
                        
                        {loanPayments.length > 0 ? (
                          <div className="relative space-y-4">
                            <div className="absolute left-[21px] top-2 bottom-2 w-0.5 bg-slate-200" />
                            {loanPayments.map((p, idx) => (
                              <div key={p.id} className="relative flex items-center gap-6 group">
                                <div className={`w-11 h-11 rounded-full border-4 border-slate-50 z-10 flex items-center justify-center shadow-sm ${
                                  idx === 0 ? 'bg-emerald-500 text-white' : 'bg-white text-slate-400'
                                }`}>
                                  <CreditCard size={18} />
                                </div>
                                <div className="flex-1 bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between group-hover:shadow-md transition-shadow">
                                  <div>
                                    <p className="text-sm font-black text-slate-800">R$ {p.amount.toLocaleString()}</p>
                                    <p className="text-[10px] text-slate-400 font-bold">{new Date(p.date).toLocaleDateString('pt-BR')}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="bg-slate-100/50 rounded-2xl p-10 text-center border-2 border-dashed border-slate-200">
                             <p className="text-slate-400 font-bold italic">Nenhum pagamento registrado.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-20 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
                  <User size={64} className="mx-auto text-slate-200 mb-6" />
                  <h4 className="text-xl font-black text-slate-400">Sem Histórico</h4>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl p-8 shadow-2xl overflow-y-auto max-h-[95vh] relative animate-in slide-in-from-bottom-4 duration-300">
             <div className="flex justify-between items-center mb-8">
               <h3 className="text-2xl font-bold text-slate-900">
                 {editingBorrowerId ? 'Editar Cadastro' : 'Novo Cadastro'}
               </h3>
               <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-transform active:scale-90"><X /></button>
             </div>
             <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-slate-700 mb-2">Nome Completo</label>
                      <input 
                        required 
                        type="text" 
                        className="w-full px-4 py-3 rounded-xl border border-slate-700 bg-slate-900 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium" 
                        placeholder="Ex: João da Silva" 
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">CPF</label>
                      <input 
                        required 
                        type="text" 
                        className="w-full px-4 py-3 rounded-xl border border-slate-700 bg-slate-900 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 outline-none font-medium" 
                        placeholder="000.000.000-00" 
                        value={formData.cpf}
                        onChange={(e) => setFormData({...formData, cpf: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Score Inicial</label>
                      <div className="w-full px-4 py-3 rounded-xl border border-slate-700 bg-slate-800 text-slate-400 font-black flex items-center justify-between">
                        <span>{formData.score}</span>
                        <span className="text-[10px] uppercase tracking-widest opacity-50">Automático</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Telefone (WhatsApp)</label>
                      <input 
                        required 
                        type="tel" 
                        placeholder="(00) 00000-0000"
                        className="w-full px-4 py-3 rounded-xl border border-slate-700 bg-slate-900 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 outline-none font-medium" 
                        value={formData.phone}
                        onChange={handlePhoneChange}
                        maxLength={15}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">E-mail</label>
                      <input 
                        required 
                        type="email" 
                        placeholder="email@exemplo.com"
                        className="w-full px-4 py-3 rounded-xl border border-slate-700 bg-slate-900 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 outline-none font-medium" 
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-slate-700 mb-2">Endereço Completo</label>
                      <input 
                        required 
                        type="text" 
                        className="w-full px-4 py-3 rounded-xl border border-slate-700 bg-slate-900 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 outline-none font-medium" 
                        value={formData.address || ''}
                        onChange={(e) => setFormData({...formData, address: e.target.value})}
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <h4 className="text-sm font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">Contato de Emergência</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <input 
                          placeholder="Nome" 
                          className="w-full px-4 py-3 rounded-xl border border-slate-700 bg-slate-900 text-white placeholder-slate-500" 
                          value={formData.emergencyContacts?.[0]?.name}
                          onChange={(e) => {
                            const contacts = [...(formData.emergencyContacts || [])];
                            contacts[0] = { ...contacts[0], name: e.target.value };
                            setFormData({...formData, emergencyContacts: contacts});
                          }}
                        />
                        <input 
                          placeholder="Parentesco" 
                          className="w-full px-4 py-3 rounded-xl border border-slate-700 bg-slate-900 text-white placeholder-slate-500" 
                          value={formData.emergencyContacts?.[0]?.relation}
                          onChange={(e) => {
                            const contacts = [...(formData.emergencyContacts || [])];
                            contacts[0] = { ...contacts[0], relation: e.target.value };
                            setFormData({...formData, emergencyContacts: contacts});
                          }}
                        />
                        <input 
                          placeholder="Telefone" 
                          className="w-full px-4 py-3 rounded-xl border border-slate-700 bg-slate-900 text-white placeholder-slate-500" 
                          value={formData.emergencyContacts?.[0]?.phone}
                          onChange={(e) => {
                            const contacts = [...(formData.emergencyContacts || [])];
                            contacts[0] = { ...contacts[0], phone: e.target.value };
                            setFormData({...formData, emergencyContacts: contacts});
                          }}
                        />
                      </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-3">Documento de Identidade</label>
                        <div className="flex gap-2">
                            <input 
                                type="file" 
                                className="hidden" 
                                ref={idInputRef} 
                                onChange={(e) => handleFileChange(e, 'idPhotoUrl')}
                                accept="image/*,application/pdf"
                            />
                            <button 
                                type="button"
                                onClick={() => idInputRef.current?.click()}
                                className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 rounded-xl border-2 border-dashed transition-all font-bold ${
                                    formData.idPhotoUrl 
                                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700' 
                                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-blue-500 hover:text-blue-500'
                                }`}
                            >
                                {formData.idPhotoUrl ? <CheckCircle size={18} /> : <Paperclip size={18} />}
                                {formData.idPhotoUrl ? 'Identidade Anexada' : 'Anexar Identidade'}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-3">Comprovante de Residência</label>
                        <div className="flex gap-2">
                            <input 
                                type="file" 
                                className="hidden" 
                                ref={addressInputRef} 
                                onChange={(e) => handleFileChange(e, 'addressProofUrl')}
                                accept="image/*,application/pdf"
                            />
                            <button 
                                type="button"
                                onClick={() => addressInputRef.current?.click()}
                                className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 rounded-xl border-2 border-dashed transition-all font-bold ${
                                    formData.addressProofUrl 
                                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700' 
                                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-blue-500 hover:text-blue-500'
                                }`}
                            >
                                {formData.addressProofUrl ? <CheckCircle size={18} /> : <Paperclip size={18} />}
                                {formData.addressProofUrl ? 'Residência Anexada' : 'Anexar Residência'}
                            </button>
                        </div>
                    </div>
                </div>

                <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all mt-4">
                  {editingBorrowerId ? 'Salvar Alterações' : 'Salvar Cliente'}
                </button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};
