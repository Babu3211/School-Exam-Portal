export const V47_VERSION=Object.freeze({label:'V47',mode:'development',multiSchool:true,production:false});
export function isProductionReady({ciPassed=false,emulatorPassed=false,uiIntegrated=false,e2ePassed=false}={}){return ciPassed===true&&emulatorPassed===true&&uiIntegrated===true&&e2ePassed===true;}
