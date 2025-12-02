import { executeRemoteCommand } from './services/remote-execution';

/**
 * Install SqlServer PowerShell module on remote server
 * Run this once to set up the remote server for PowerShell 7
 */
async function installSqlServerModule() {
    console.log('🔧 Installing SqlServer module on remote server...');

    try {
        // Install SqlServer module in PowerShell 7
        const installCommand = `pwsh.exe -Command "Install-Module -Name SqlServer -Force -AllowClobber -Scope AllUsers -SkipPublisherCheck"`;

        console.log('📦 Running: Install-Module -Name SqlServer');
        const result = await executeRemoteCommand(installCommand, {
            timeout: 300000, // 5 minutes for module installation
            onOutput: (output) => {
                console.log(`   [Remote] ${output.trim()}`);
            }
        });

        if (result.exitCode === 0) {
            console.log('✅ SqlServer module installed successfully!');

            // Verify installation
            console.log('\n🔍 Verifying installation...');
            const verifyCommand = `pwsh.exe -Command "Get-Module -ListAvailable -Name SqlServer | Select-Object Name, Version"`;
            const verifyResult = await executeRemoteCommand(verifyCommand);

            console.log('📋 Installed modules:');
            console.log(verifyResult.stdout);

            return true;
        } else {
            console.error('❌ Installation failed!');
            console.error('STDERR:', result.stderr);
            console.error('STDOUT:', result.stdout);
            return false;
        }
    } catch (error: any) {
        console.error('❌ Error installing SqlServer module:', error.message);
        return false;
    }
}

// Run the installation
installSqlServerModule()
    .then((success) => {
        if (success) {
            console.log('\n✅ Setup complete! You can now run restore operations.');
        } else {
            console.log('\n❌ Setup failed. Please check the errors above.');
        }
        process.exit(success ? 0 : 1);
    })
    .catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
