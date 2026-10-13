require('dotenv').config();
const express = require('express'); // Tambahan untuk hosting Render
const { 
    Client, 
    GatewayIntentBits, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    EmbedBuilder,
    Events
} = require('discord.js');

// --- SETUP SERVER HTTP (Agar bot tidak tertidur di Render) ---
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('💖 DatingBot Discord is active and running 24/7!');
});

app.listen(PORT, () => {
    console.log(`Server HTTP berjalan di port ${PORT}`);
});
// -----------------------------------------------------------

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ]
});

// Database memori sementara
const userProfiles = new Map();
const userStates = new Map();

client.once(Events.ClientReady, c => {
    console.log(`💖 Bot Dating Apps online sebagai ${c.user.tag}!`);
});

// Fungsi Pembantu: Mengambil Profil Acak (Fitur Skip)
function getRandomProfile(currentUserId, excludeTargetId = null) {
    let availableProfiles = Array.from(userProfiles.values()).filter(p => p.userId !== currentUserId);
    
    if (excludeTargetId && availableProfiles.length > 1) {
        availableProfiles = availableProfiles.filter(p => p.userId !== excludeTargetId);
    }

    if (availableProfiles.length === 0) return null;
    return availableProfiles[Math.floor(Math.random() * availableProfiles.length)];
}

// Menangani Perintah !dating atau !menu
client.on(Events.MessageCreate, async message => {
    if (message.author.bot) return;

    if (message.content === '!dating' || message.content === '!menu') {
        const embedMenu = new EmbedBuilder()
            .setTitle('💖 WELCOME TO DATINGBOT APSS! 💖')
            .setDescription(
                'Halo, selamat datang di Rumah Sakit Jiwa! 🏥💖\n\n' +
                'Tempat di mana hati bisa sembuh, cinta bisa tumbuh, dan jomblo punya harapan baru. 🤖💖\n\n' +
                '✨ **Apa yang bisa kamu lakukan?**\n' +
                '💌 Cari pasangan dan kenalan baru.\n' +
                '💖 Temukan teman yang cocok denganmu.\n' +
                '🎭 Ikuti keseruan bersama warga server.\n' +
                '💖 Siapa tahu, kamu menemukan seseorang yang spesial!\n\n' +
                '📋 Siapkan hati, buka kesempatan, dan mulai petualangan cintamu!\n\n' +
                'Ingat, di sini kita mencari pasangan, bukan mencari dokter. 😭💖\n\n' +
                '**Selamat bermain dan semoga tidak salah diagnosis cinta!**'
            )
            .setColor('#FE01D4')
            .setThumbnail(client.user.displayAvatarURL())
            .setFooter({ text: 'DatingBot • Rumah Sakit Jiwa Cinta' });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('btn_register')
                .setLabel('📝 Buat Profil')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('btn_find')
                .setLabel('💘 Cari Pasangan')
                .setStyle(ButtonStyle.Primary)
        );

        await message.reply({ embeds: [embedMenu], components: [row] });
    }
});

// Menangani Interaction (Klik Tombol & Modal Form)
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isButton() && !interaction.isModalSubmit()) return;

    // 1. Klik "Buat Profil" -> Tampilkan Form Modal
    if (interaction.isButton() && interaction.customId === 'btn_register') {
        const modal = new ModalBuilder()
            .setCustomId('modal_profile')
            .setTitle('📝 Pendaftaran Profil Dating');

        const genderInput = new TextInputBuilder()
            .setCustomId('input_gender')
            .setLabel('Gender (Pria / Wanita)')
            .setPlaceholder('Contoh: Pria')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const ageInput = new TextInputBuilder()
            .setCustomId('input_age')
            .setLabel('Umur')
            .setPlaceholder('Contoh: 20')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const originInput = new TextInputBuilder()
            .setCustomId('input_origin')
            .setLabel('Asal / Kota')
            .setPlaceholder('Contoh: Manado / Jakarta')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const bioInput = new TextInputBuilder()
            .setCustomId('input_bio')
            .setLabel('Bio / Deskripsi Singkat')
            .setPlaceholder('Ceritakan sedikit tentang dirimu...')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false);

        modal.addComponents(
            new ActionRowBuilder().addComponents(genderInput),
            new ActionRowBuilder().addComponents(ageInput),
            new ActionRowBuilder().addComponents(originInput),
            new ActionRowBuilder().addComponents(bioInput)
        );

        await interaction.showModal(modal);
    }

    // 2. Submit Form -> Simpan sementara
    if (interaction.isModalSubmit() && interaction.customId === 'modal_profile') {
        const gender = interaction.fields.getTextInputValue('input_gender');
        const age = interaction.fields.getTextInputValue('input_age');
        const origin = interaction.fields.getTextInputValue('input_origin');
        const bio = interaction.fields.getTextInputValue('input_bio') || 'Tidak ada bio.';

        userStates.set(interaction.user.id, { gender, age, origin, bio });

        await interaction.reply({ 
            content: '✅ **Data berhasil disimpan!**\n📸 **Langkah Terakhir:** Silakan **upload/kirim file foto (.png / .jpg)** kamu di channel ini sekarang. Pesan foto kamu akan langsung terhapus otomatis seketika agar privasimu terjaga 100%!', 
            ephemeral: true 
        });
    }

    // 3. Klik "Cari Pasangan" ATAU Klik "Skip / Lanjut"
    if (interaction.isButton() && (interaction.customId === 'btn_find' || interaction.customId.startsWith('skip_'))) {
        let excludeTargetId = null;
        if (interaction.customId.startsWith('skip_')) {
            excludeTargetId = interaction.customId.split('_')[1];
        }

        const randomProfile = getRandomProfile(interaction.user.id, excludeTargetId);

        if (!randomProfile) {
            const noProfileMsg = '💔 Belum ada profil pengguna lain yang bisa ditampilkan saat ini. Ajak teman-mu mendaftar dulu ya!';
            if (interaction.replied || interaction.deferred) {
                return interaction.followUp({ content: noProfileMsg, ephemeral: true });
            }
            return interaction.reply({ content: noProfileMsg, ephemeral: true });
        }

        const cardEmbed = new EmbedBuilder()
            .setTitle(`💘 Profil: ${randomProfile.username}`)
            .setColor('#FE01D4')
            .addFields(
                { name: '👤 Gender', value: randomProfile.gender, inline: true },
                { name: '🎂 Umur', value: `${randomProfile.age} Tahun`, inline: true },
                { name: '📍 Asal/Kota', value: randomProfile.origin, inline: true },
                { name: '📝 Bio / Deskripsi', value: randomProfile.bio }
            )
            .setImage(randomProfile.photoUrl)
            .setFooter({ text: 'Cocok dengan profil ini? Klik Match / Chat atau Skip untuk cari yang lain!' });

        const rowCard = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`like_${randomProfile.userId}`)
                .setLabel('💖 Match / Chat')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(`skip_${randomProfile.userId}`)
                .setLabel('❌ Skip / Lanjut')
                .setStyle(ButtonStyle.Secondary)
        );

        await interaction.reply({ embeds: [cardEmbed], components: [rowCard], ephemeral: true });
    }

    // 4. Klik "Match / Chat"
    if (interaction.isButton() && interaction.customId.startsWith('like_')) {
        const targetUserId = interaction.customId.split('_')[1];
        await interaction.reply({
            content: `🎉 **Match Sempurna!** Kamu tertarik dengan profil ini. Silakan sapa pengguna tersebut langsung via DM: <@${targetUserId}>`,
            ephemeral: true
        });
    }
});

// Menangkap file foto & langsung menghapusnya tanpa delay
client.on(Events.MessageCreate, async message => {
    if (message.author.bot) return;

    if (userStates.has(message.author.id)) {
        if (message.attachments.size > 0) {
            const attachment = message.attachments.first();
            const photoUrl = attachment.url;
            const stateData = userStates.get(message.author.id);

            message.delete().catch(() => {});

            userProfiles.set(message.author.id, {
                userId: message.author.id,
                username: message.author.username,
                ...stateData,
                photoUrl: photoUrl
            });

            userStates.delete(message.author.id);

            const previewEmbed = new EmbedBuilder()
                .setTitle(`💖 Profil Dating Berhasil Dibuat & Disembunyikan!`)
                .setColor('#FE01D4')
                .addFields(
                    { name: '👤 Gender', value: stateData.gender, inline: true },
                    { name: '🎂 Umur', value: `${stateData.age} Tahun`, inline: true },
                    { name: '📍 Asal/Kota', value: stateData.origin, inline: true },
                    { name: '📝 Bio / Deskripsi', value: stateData.bio }
                )
                .setImage(photoUrl)
                .setFooter({ text: 'Profilmu aman & rahasia. Pengguna lain hanya bisa melihatnya saat menekan Cari Pasangan!' });

            try {
                await message.author.send({ 
                    content: `🎉 **Selamat <@${message.author.id}>! Profil kamu telah berhasil dibuat dan fotomu aman tersembunyi.**`, 
                    embeds: [previewEmbed] 
                });
            } catch (err) {
                console.log('DM pengguna tertutup.');
            }
        }
    }
});

client.login(process.env.DISCORD_TOKEN);