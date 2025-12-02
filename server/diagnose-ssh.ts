import 'dotenv/config';
import { executeRemoteCommand } from './services/remote-execution';

async function diagnoseRemoteModules() {
    console.log('🔍 Diagnosing Remote PowerShell Environment...');

    // 1. Check PowerShell Version
    console.log('\n1️⃣  Checking PowerShell Version...');
    await executeRemoteCommand('pwsh.exe -Command "$PSVersionTable.PSVersion"', {
        onOutput: (out) => console.log('   ' + out.trim())
    });

    // 2. Check Module Paths
    console.log('\n2️⃣  Checking Module Paths ($env:PSModulePath)...');
    await executeRemoteCommand('pwsh.exe -Command "$env:PSModulePath -split \';\'"', {
        onOutput: (out) => console.log('   ' + out.trim())
    });

    // 3. Check if SqlServer module is listed
    console.log('\n3️⃣  Searching for SqlServer module...');
    await executeRemoteCommand('pwsh.exe -Command "Get-Module -ListAvailable -Name SqlServer | Select-Object Name, Version, Path"', {
        onOutput: (out) => console.log('   ' + out.trim())
    });

    // 4. Try to find it in Windows PowerShell just in case
    console.log('\n4️⃣  Checking Windows PowerShell (powershell.exe) for comparison...');
    await executeRemoteCommand('powershell.exe -Command "Get-Module -ListAvailable -Name SqlServer | Select-Object Name, Version, Path"', {
        onOutput: (out) => console.log('   ' + out.trim())
    });
}

diagnoseRemoteModules().catch(console.error);
