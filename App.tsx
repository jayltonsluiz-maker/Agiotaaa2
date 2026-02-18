
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Borrowers } from './components/Borrowers';
import { Loans } from './components/Loans';
import { Overdue } from './components/Overdue';
import { INITIAL_BORROWERS, INITIAL_LOANS, INITIAL_PAYMENTS } from './constants';
import { AppState, Loan, Borrower, Payment, LoanStatus } from './types';

const STORAGE_KEY = 'credimanager_v2_persistent_state';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        return {
          borrowers: parsed.borrowers || [],
          loans: parsed.loans || [],
          payments: parsed.payments || [],
        };
      } catch (error) {
        console.error("Erro ao carregar dados salvos:", error);
      }
    }
    return {
      borrowers: INITIAL_BORROWERS,
      loans: INITIAL_LOANS,
      payments: INITIAL_PAYMENTS,
    };
  });

  useEffect(() => {
    const persist = () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    };
    persist();
    window.addEventListener('blur', persist);
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') persist();
    });
    return () => window.removeEventListener('blur', persist);
  }, [state]);

  // Função Auxiliar de Cálculo de PMT para Score
  const calculatePMT = (P: number, i: number, n: number) => {
    if (i === 0) return P / n;
    return P * (i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1);
  };

  const calculateScoreChange = (loan: Loan, paymentDate: string): number => {
    const pmt = calculatePMT(loan.principalAmount, loan.monthlyInterestRate, loan.installments);
    const installmentsPaid = Math.floor(loan.totalPaid / pmt);
    
    const dueDate = new Date(loan.startDate);
    dueDate.setMonth(dueDate.getMonth() + installmentsPaid + 1);
    dueDate.setHours(0, 0, 0, 0);

    const payDate = new Date(paymentDate);
    payDate.setHours(0, 0, 0, 0);

    const diffTime = payDate.getTime() - dueDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 2;
    if (diffDays === 0) return 1;
    if (diffDays > 15) return -2;
    if (diffDays > 7) return -1;
    return 0;
  };

  const addBorrower = (b: Borrower) => {
    const newB = { ...b, id: `b-${Math.random().toString(36).substr(2, 9)}`, score: 50 };
    setState(prev => ({ ...prev, borrowers: [...prev.borrowers, newB] }));
  };

  const updateBorrower = (updatedB: Borrower) => {
    setState(prev => ({
      ...prev,
      borrowers: prev.borrowers.map(b => b.id === updatedB.id ? updatedB : b)
    }));
  };

  const deleteBorrower = (id: string) => {
    if (window.confirm('Excluir este cliente também removerá seus contratos. Confirmar?')) {
        setState(prev => ({ 
            ...prev, 
            borrowers: prev.borrowers.filter(b => b.id !== id),
            loans: prev.loans.filter(l => l.borrowerId !== id)
        }));
    }
  };

  const addLoan = (l: Loan) => {
    setState(prev => ({ ...prev, loans: [...prev.loans, l] }));
  };

  const deleteLoan = (id: string) => {
    setState(prev => ({
      ...prev,
      loans: prev.loans.filter(l => l.id !== id),
      payments: prev.payments.filter(p => p.loanId !== id)
    }));
  };

  const updateLoan = (updatedLoan: Loan) => {
    setState(prev => ({
      ...prev,
      loans: prev.loans.map(l => l.id === updatedLoan.id ? updatedLoan : l)
    }));
  };

  const syncLoanAndScore = (loanId: string, paymentDate: string, currentPayments: Payment[], prevState: AppState) => {
    const loan = prevState.loans.find(l => l.id === loanId);
    if (!loan) return prevState;

    const loanPayments = currentPayments.filter(p => p.loanId === loanId);
    const totalPaid = loanPayments.reduce((acc, p) => acc + p.amount, 0);
    const totalContractValue = loan.principalAmount + loan.accruedInterest;
    const newRemaining = Math.max(0, totalContractValue - totalPaid);
    const isPaid = newRemaining === 0;

    const updatedLoans = prevState.loans.map(l => 
      l.id === loanId 
        ? { 
            ...l, 
            remainingPrincipal: newRemaining,
            totalPaid: totalPaid,
            status: isPaid ? LoanStatus.PAID : (l.status === LoanStatus.PAID ? LoanStatus.ACTIVE : l.status) 
          } 
        : l
    );

    const scoreChange = calculateScoreChange(loan, paymentDate);
    const updatedBorrowers = prevState.borrowers.map(b => {
      if (b.id !== loan.borrowerId) return b;
      const newScore = Math.max(0, Math.min(100, (b.score || 50) + scoreChange));
      return { ...b, score: newScore };
    });

    return { ...prevState, loans: updatedLoans, borrowers: updatedBorrowers, payments: currentPayments };
  };

  const addPayment = (p: Payment) => {
    setState(prev => {
      const newPayments = [...prev.payments, p];
      return syncLoanAndScore(p.loanId, p.date, newPayments, prev);
    });
  };

  const updatePayment = (updatedP: Payment) => {
    setState(prev => {
      const newPayments = prev.payments.map(p => p.id === updatedP.id ? updatedP : p);
      return syncLoanAndScore(updatedP.loanId, updatedP.date, newPayments, prev);
    });
  };

  const deletePayment = (paymentId: string) => {
    setState(prev => {
      const payment = prev.payments.find(p => p.id === paymentId);
      if (!payment) return prev;
      const newPayments = prev.payments.filter(p => p.id !== paymentId);
      
      const totalPaid = newPayments.filter(pay => pay.loanId === payment.loanId).reduce((acc, pay) => acc + pay.amount, 0);
      const loan = prev.loans.find(l => l.id === payment.loanId)!;
      const totalVal = loan.principalAmount + loan.accruedInterest;
      const rem = Math.max(0, totalVal - totalPaid);

      const uLoans = prev.loans.map(l => l.id === payment.loanId ? { ...l, totalPaid: totalPaid, remainingPrincipal: rem, status: rem === 0 ? LoanStatus.PAID : LoanStatus.ACTIVE } : l);
      return { ...prev, payments: newPayments, loans: uLoans };
    });
  };

  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard state={state} />} />
          <Route path="/borrowers" element={
            <Borrowers 
              borrowers={state.borrowers} 
              loans={state.loans}
              payments={state.payments}
              onAdd={addBorrower} 
              onDelete={deleteBorrower}
              onUpdate={updateBorrower}
            />
          } />
          <Route path="/loans" element={
            <Loans 
              state={state} 
              onAddLoan={addLoan} 
              onAddPayment={addPayment}
              onUpdatePayment={updatePayment}
              onDeletePayment={deletePayment}
              onDeleteLoan={deleteLoan}
              onUpdateLoan={updateLoan}
            />
          } />
          <Route path="/overdue" element={
            <Overdue 
              state={state} 
              onAddLoan={addLoan} 
              onAddPayment={addPayment}
              onUpdatePayment={updatePayment}
              onDeletePayment={deletePayment}
              onDeleteLoan={deleteLoan}
              onUpdateLoan={updateLoan}
            />
          } />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
};

export default App;
