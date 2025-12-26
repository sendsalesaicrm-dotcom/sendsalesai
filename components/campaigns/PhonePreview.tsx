import React from 'react';
import { ButtonConfig, TemplateCategory } from '../../types';
import { Link as LinkIcon, Phone, Copy, MousePointerClick } from 'lucide-react';

interface PhonePreviewProps {
  header: string;
  body: string;
  footer: string;
  buttons: ButtonConfig[];
  variables: string[];
  variableValues: Record<string, string>;
  category: TemplateCategory;
}

const PhonePreview: React.FC<PhonePreviewProps> = ({
  header, body, footer, buttons, variables, variableValues, category
}) => {
  
  // Helper: Generate preview text with replaced variables
  const getPreviewBody = () => {
    let preview = body;
    variables.forEach(v => {
        const val = variableValues[v];
        if (val) {
            // Replace all occurrences of {{v}} with the sample value
            preview = preview.split(`{{${v}}}`).join(val);
        }
    });
    return preview;
  };

  return (
    <div className="w-full lg:w-[400px] bg-[#f0f2f5] p-8 flex flex-col items-center justify-start border-l border-gray-200 min-h-[700px] sticky top-0">
        <h3 className="font-bold text-gray-700 mb-6 self-start w-full px-4">Prévia do modelo</h3>
        
        {/* Phone Mockup */}
        <div className="w-[300px] bg-white rounded-[3rem] border-[8px] border-gray-800 overflow-hidden shadow-2xl relative">
            {/* Notch */}
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-6 bg-gray-800 rounded-b-xl z-20"></div>
            
            {/* Screen */}
            <div className="h-[550px] bg-[#E5DDD5] relative flex flex-col pt-12 pb-4 overflow-y-auto" style={{backgroundImage: "url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')", backgroundBlendMode: 'overlay'}}>
                
                {/* Message Bubble Container */}
                <div className="mx-4 self-start max-w-[90%]">
                    <div className={`bg-white rounded-lg p-3 shadow-sm relative rounded-tl-none ${buttons.length > 0 ? 'rounded-b-none border-b border-gray-100' : ''}`}>
                        {/* Header */}
                        {header && (
                            <div className="font-bold text-gray-900 mb-1 text-sm">{header}</div>
                        )}
                        
                        {/* Body */}
                        <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed break-words">
                            {getPreviewBody() || <span className="text-gray-300 italic">O conteúdo da mensagem aparecerá aqui...</span>}
                        </div>
                        
                        {/* Footer */}
                        <div className="flex justify-between items-end mt-1">
                            <span className="text-[10px] text-gray-400">{footer}</span>
                            <span className="text-[10px] text-gray-400 ml-2">12:00</span>
                        </div>
                    </div>
                    
                    {/* Buttons Rendering */}
                    {buttons.length > 0 && (
                        <div className="bg-white rounded-b-lg shadow-sm overflow-hidden">
                            {buttons.map((btn, idx) => (
                                <div 
                                    key={idx} 
                                    className="border-t border-gray-100 py-2.5 flex items-center justify-center gap-2 cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors"
                                >
                                    {btn.type === 'URL' && <LinkIcon className="w-3 h-3 text-[#0084ff]" />}
                                    {btn.type === 'PHONE_NUMBER' && <Phone className="w-3 h-3 text-[#0084ff]" />}
                                    {btn.type === 'COPY_CODE' && <Copy className="w-3 h-3 text-[#0084ff]" />}
                                    {btn.type === 'QUICK_REPLY' && <MousePointerClick className="w-3 h-3 text-[#0084ff]" />}
                                    
                                    <span className="text-[#0084ff] font-medium text-sm">
                                        {btn.text || 'Botão'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </div>
        
        <div className="mt-8 p-4 bg-white rounded-lg shadow-sm w-full max-w-[300px]">
            <h4 className="font-bold text-sm text-gray-800 mb-1">Este modelo é ideal para</h4>
            <p className="text-xs text-gray-500">
                {category === 'MARKETING' && "Promoções, ofertas, mensagens de boas-vindas."}
                {category === 'UTILITY' && "Atualizações de pedidos, confirmações, alertas."}
                {category === 'AUTHENTICATION' && "Códigos de verificação, OTPs."}
            </p>
        </div>
    </div>
  );
};

export default PhonePreview;
