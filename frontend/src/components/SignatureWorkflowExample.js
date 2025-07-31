import React, { useState } from 'react';
import DocumentSignatureWorkflow from './DocumentSignatureWorkflow';
import { FileText, PenTool, Send } from 'lucide-react';

const SignatureWorkflowExample = ({ deal }) => {
  const [showWorkflow, setShowWorkflow] = useState(false);
  const [workflowComplete, setWorkflowComplete] = useState(false);

  const handleWorkflowComplete = (result) => {
    setWorkflowComplete(true);
    setShowWorkflow(false);
    console.log('Signature workflow completed:', result);
    // Here you can update the deal status, send notifications, etc.
  };

  return (
    <div className="space-y-4">
      {/* Quick Actions */}
      <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-4">
        <h3 className="text-lg font-bold text-white mb-3">Document Signing</h3>
        
        {!workflowComplete ? (
          <div className="space-y-3">
            <button
              onClick={() => setShowWorkflow(true)}
              className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2"
            >
              <PenTool className="h-5 w-5" />
              <span>Start Document Signature Workflow</span>
            </button>
            
            <p className="text-sm text-gray-400 text-center">
              This will allow you to sign the document and send it to the client for their signature.
            </p>
          </div>
        ) : (
          <div className="text-center">
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
              <div className="flex items-center justify-center mb-2">
                <FileText className="h-6 w-6 text-green-400 mr-2" />
                <span className="text-green-400 font-semibold">Document Fully Signed!</span>
              </div>
              <p className="text-gray-300 text-sm">
                Both finance team and client have signed the document.
              </p>
            </div>
            
            <button
              onClick={() => setWorkflowComplete(false)}
              className="mt-3 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              Start New Workflow
            </button>
          </div>
        )}
      </div>

      {/* Workflow Modal */}
      {showWorkflow && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl border border-white/10 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Document Signature Workflow</h2>
                <button
                  onClick={() => setShowWorkflow(false)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              
              <DocumentSignatureWorkflow
                dealId={deal.id}
                documentType="purchase_agreement"
                onComplete={handleWorkflowComplete}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SignatureWorkflowExample; 