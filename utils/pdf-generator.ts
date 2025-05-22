import jsPDF from 'jspdf';
import { Investment } from '@/app/api/investments/route';

// Define types for TypeScript
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export interface InvestmentWithData extends Investment {
  currentPrice?: number;
  totalValue?: number;
  gainLoss?: number;
  gainLossPercentage?: number;
}

// Using generic interfaces to avoid conflicts with page.tsx interfaces
export interface PortfolioGradeData {
  overall: string;
  diversification: string;
  risk: string;
  performance: string;
  analysis: string[];
}

export interface AssetGradeData {
  symbol: string;
  grade: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

interface PortfolioReportOptions {
  investments: InvestmentWithData[];
  portfolioGrade?: PortfolioGradeData;
  assetGrades?: AssetGradeData[];
  userName?: string;
  reportDate?: Date;
}

/**
 * Generates a PDF report for a user's investment portfolio
 * This version uses only basic jsPDF functionality without plugins
 */
export async function generatePortfolioReport({
  investments,
  portfolioGrade,
  assetGrades,
  userName = 'Investor',
  reportDate = new Date(),
}: PortfolioReportOptions): Promise<Blob> {
  // Initialize PDF document
  const doc = new jsPDF();
  const dateFormatted = reportDate.toLocaleDateString();
  
  try {
    // Basic header
    doc.setFontSize(20);
    doc.setTextColor(0, 77, 153); // Dark blue color
    doc.text('Investment Portfolio Report', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Prepared for: ${userName}`, 20, 30);
    doc.text(`Date: ${dateFormatted}`, 20, 37);
    
    // Calculate portfolio metrics
    const totalInvested = investments.reduce((sum, inv) => sum + (inv.purchase_price * inv.shares), 0);
    const currentValue = investments.reduce((sum, inv) => sum + (inv.totalValue || 0), 0);
    const totalGainLoss = currentValue - totalInvested;
    const totalGainLossPercentage = (totalGainLoss / totalInvested) * 100;
    
    // Portfolio summary section
    let y = 50;
    doc.setFontSize(16);
    doc.setTextColor(0, 77, 153);
    doc.text('Portfolio Summary', 20, y);
    y += 10;
    
    // Summary metrics
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Total Investments: ${investments.length}`, 25, y); y += 10;
    doc.text(`Total Invested: $${totalInvested.toFixed(2)}`, 25, y); y += 10;
    doc.text(`Current Value: $${currentValue.toFixed(2)}`, 25, y); y += 10;
    doc.text(`Gain/Loss: $${totalGainLoss.toFixed(2)} (${totalGainLossPercentage.toFixed(2)}%)`, 25, y); y += 20;
    
    // Portfolio Grade if available
    if (portfolioGrade) {
      doc.setFontSize(16);
      doc.setTextColor(0, 77, 153);
      doc.text('Portfolio Grade', 20, y);
      y += 10;
      
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text(`Overall: ${portfolioGrade.overall}`, 25, y); y += 10;
      doc.text(`Diversification: ${portfolioGrade.diversification}`, 25, y); y += 10;
      doc.text(`Risk Management: ${portfolioGrade.risk}`, 25, y); y += 10;
      doc.text(`Performance: ${portfolioGrade.performance}`, 25, y); y += 15;
      
      // Analysis section
      doc.setFontSize(14);
      doc.setTextColor(0, 77, 153);
      doc.text('Analysis & Recommendations', 20, y);
      y += 10;
      
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      
      portfolioGrade.analysis.forEach((point, index) => {
        // Check if we need a new page
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        
        doc.text(`• ${point}`, 25, y);
        y += 8;
      });
      
      y += 10;
    }
    
    // Check if we need a new page for investments
    if (y > 200) {
      doc.addPage();
      y = 20;
    }
    
    // Investments table
    doc.setFontSize(16);
    doc.setTextColor(0, 77, 153);
    doc.text('Investment Holdings', 20, y);
    y += 10;
    
    // Table header
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text('Symbol', 20, y);
    doc.text('Shares', 60, y);
    doc.text('Purchase Price', 90, y);
    doc.text('Current Price', 130, y);
    doc.text('Current Value', 165, y);
    y += 5;
    
    // Draw a line
    doc.line(20, y, 190, y);
    y += 7;
    
    // Table rows
    investments.forEach(inv => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      
      doc.text(inv.symbol, 20, y);
      doc.text(inv.shares.toString(), 60, y);
      doc.text(`$${inv.purchase_price.toFixed(2)}`, 90, y);
      doc.text(`$${(inv.currentPrice || 0).toFixed(2)}`, 130, y);
      doc.text(`$${(inv.totalValue || 0).toFixed(2)}`, 165, y);
      y += 8;
    });
    
    // Add individual asset analysis if available
    if (assetGrades && assetGrades.length > 0) {
      doc.addPage();
      y = 20;
      
      doc.setFontSize(16);
      doc.setTextColor(0, 77, 153);
      doc.text('Individual Asset Analysis', 20, y);
      y += 15;
      
      assetGrades.forEach((asset, index) => {
        // Add a page break if needed
        if (y > 240) {
          doc.addPage();
          y = 20;
        }
        
        doc.setFontSize(14);
        doc.setTextColor(0, 77, 153);
        doc.text(`${asset.symbol} - Grade: ${asset.grade}`, 20, y);
        y += 10;
        
        // Strengths
        doc.setFontSize(12);
        doc.setTextColor(0, 102, 0); // Dark green
        doc.text('Strengths:', 25, y);
        y += 7;
        
        doc.setTextColor(0, 0, 0);
        asset.strengths.forEach(strength => {
          doc.text(`• ${strength}`, 30, y);
          y += 7;
        });
        y += 3;
        
        // Weaknesses
        doc.setFontSize(12);
        doc.setTextColor(153, 0, 0); // Dark red
        doc.text('Areas of Concern:', 25, y);
        y += 7;
        
        doc.setTextColor(0, 0, 0);
        asset.weaknesses.forEach(weakness => {
          doc.text(`• ${weakness}`, 30, y);
          y += 7;
        });
        y += 3;
        
        // Recommendations
        doc.setFontSize(12);
        doc.setTextColor(0, 77, 153); // Dark blue
        doc.text('Recommendations:', 25, y);
        y += 7;
        
        doc.setTextColor(0, 0, 0);
        asset.recommendations.forEach(rec => {
          doc.text(`• ${rec}`, 30, y);
          y += 7;
        });
        
        y += 15;
      });
    }
    
    // Add footer with date and page numbers
    try {
      // Use a safer approach to get page count
      const pageCount = (doc as any).internal.pages.length - 1;
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Generated on ${dateFormatted} | Page ${i} of ${pageCount}`, 105, 287, { align: 'center' });
      }
    } catch (error) {
      console.error('Error adding page numbers:', error);
      // If page numbering fails, just continue without it
    }
    
    // Return PDF as a blob
    return doc.output('blob');
  } catch (error) {
    console.error('Error generating PDF:', error);
    
    // If there's an error, return a minimal PDF with an error message
    const errorDoc = new jsPDF();
    errorDoc.setFontSize(20);
    errorDoc.setTextColor(255, 0, 0);
    errorDoc.text('Error Generating PDF Report', 105, 20, { align: 'center' });
    
    errorDoc.setFontSize(12);
    errorDoc.setTextColor(0, 0, 0);
    errorDoc.text('We encountered an error while generating your PDF report.', 20, 40);
    errorDoc.text('Please try again later or contact support if the issue persists.', 20, 50);
    
    // Add basic portfolio info if available
    if (investments.length > 0) {
      errorDoc.text(`Total Investments: ${investments.length}`, 20, 70);
    }
    
    return errorDoc.output('blob');
  }
} 