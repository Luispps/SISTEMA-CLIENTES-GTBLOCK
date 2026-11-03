// Exclusivamente backend. Nenhuma requisição aos fornecedores nesta primeira etapa.
export class IntegrationUnavailable extends Error {}
export function integrationMode() {
 if ((process.env.INTEGRATION_MODE || 'mock') !== 'mock') throw new IntegrationUnavailable('Integração real ainda não homologada.');
}
export function customerData(customerId, scenario='normal') {
 integrationMode();
 if(scenario==='unavailable') throw new IntegrationUnavailable('Fornecedor temporariamente indisponível.');
 if(scenario==='empty') return {source:'mock',subscription:null,vehicles:[],invoices:[],contracts:[]};
 const ana=customerId==='demo-ana';
 if(!ana && customerId!=='demo-bruno') return {source:'mock',subscription:null,vehicles:[],invoices:[],contracts:[]};
 return {
  source:'mock',updatedAt:new Date().toISOString(),
  subscription:{name:ana?'PLUS':'STANDARD',status:'Ativa',price:ana?89.9:79.9,benefits:['Rastreamento veicular','Atendimento especializado','Tecnologia 4G'],note:'Plano e benefícios ilustrativos. Origem cadastral a confirmar.'},
  vehicles:[{id:ana?'v-ana':'v-bruno',name:ana?'Volkswagen T-Cross':'Chevrolet Onix',plate:ana?'DEMO • 01':'DEMO • 02',detail:ana?'2024 · Cinza · SUV':'2023 · Branco · Hatch'}],
  invoices:[{id:customerId+'-nov',label:'Mensalidade · Novembro',amount:ana?89.9:79.9,due:'2026-11-10',status:'Em aberto',boletoAvailable:true,digitableLine:null,pix:null},{id:customerId+'-out',label:'Mensalidade · Outubro',amount:ana?89.9:79.9,due:'2026-10-10',status:'Pago',boletoAvailable:false,digitableLine:null,pix:null},{id:customerId+'-set',label:'Mensalidade · Setembro',amount:ana?89.9:79.9,due:'2026-09-10',status:'Pago',boletoAvailable:false,digitableLine:null,pix:null}],
  contracts:[{id:customerId+'-contract',name:'Contrato de prestação de serviços',status:'Assinado',date:'2026-08-12',fileAvailable:true,signingAvailable:false},{id:customerId+'-addendum',name:'Termo de atualização cadastral',status:'Assinatura pendente',date:'2026-11-01',fileAvailable:true,signingAvailable:false}]
 };
}
export function ownedResource(customerId,kind,id) {
 return customerData(customerId)[kind].find(x=>x.id===id);
}
// Contrato do futuro adapter: listInvoices(customer.siprov_id), getBoleto(ownedTitle),
// getDocument(verifiedDocumentLink), getSigningLink(verifiedSignerLink).
// Não há fallback de live para mock. POST/PUT/DELETE de cobranças não são implementados.
