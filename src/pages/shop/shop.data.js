const SHOP_DATA = {
    hats: {
        id: 1,
        title: 'Hats',
        routeName: 'hats',
        items: [{
                id: 1,
                name: 'Ribbed Beanie - Black',
                imageUrl: 'https://cdn.shopify.com/s/files/1/0293/9277/products/11-08-19_Studio_5_JR_07-45-57_8_MMQ7301_Black_0859_RG_468x.jpg?v=1573517576',
                price: 5.99
            },
            {
                id: 2,
                name: 'Trust NO1 Distressed Dad Hat - Black/White',
                imageUrl: 'https://cdn.shopify.com/s/files/1/0293/9277/products/04-26-20_MA_12-04-55_31_KBSV055_BlackWhite_1222_JK_468x.jpg?v=1588099985',
                price: 6.99
            },
            {
                id: 3,
                name: 'Call Him Daddy Embroidered Beanie - Pink/combo',
                imageUrl: 'https://cdn.shopify.com/s/files/1/0293/9277/products/09-08-20Lightbox_CE_09-32-54_9_FNMBSE05_Pinkcombo_4431_KL_468x.jpg?v=1599604503',
                price: 5.98
            },
            {
                id: 4,
                name: 'GTrap King 2 Pack Beanie Set - Mint/combo',
                imageUrl: 'https://cdn.shopify.com/s/files/1/0293/9277/products/08-27-20Studio1_JP_DJ_11-16-44_18_FNMBSET8_Mintcombo_3605_JK_468x.jpg?v=1598660284',
                price: 25
            },
            {
                id: 5,
                name: 'Baller Embroidered Beanie - Black',
                imageUrl: 'https://cdn.shopify.com/s/files/1/0293/9277/products/11-30-20Studio4_SR_SD_14-01-49_103_KBECLASSIC_White_53103_NT_360x.jpg?v=1606784097',
                price: 18
            },
            {
                id: 6,
                name: 'Instafamous Dad Hat - Navy',
                imageUrl: 'https://cdn.shopify.com/s/files/1/0293/9277/products/04-23-20Lightbox_CE_17-02-49_20_KBECLASSIC_Navy_P_2307_KL_360x.jpg?v=1588177640',
                price: 9.99
            },
            {
                id: 7,
                name: 'Disobey Dad Hat - Orange',
                imageUrl: 'https://cdn.shopify.com/s/files/1/0293/9277/products/01-19-21Studio3_RT_ON_TB_08-43-27_1_SPDNA118_Orange_P_73885_JK_360x.jpg?v=1611104069',
                price: 18
            },
            {
                id: 8,
                name: 'Instafamous Dad Hat - Blue',
                imageUrl: 'https://cdn.shopify.com/s/files/1/0293/9277/products/11-30-20Studio4_SR_SD_13-41-32_93_KBECLASSIC_Blue_53005_NT_360x.jpg?v=1606784416',
                price: 14
            },
            {
                id: 9,
                name: 'Blue Snapback',
                imageUrl: 'https://i.ibb.co/X2VJP2W/blue-snapback.png',
                price: 16
            }
        ]
    },
    sneakers: {
        id: 2,
        title: 'Sneakers',
        routeName: 'sneakers',
        items: [{
                id: 10,
                name: 'MEN\'S NIKE AIR VAPORMAX PLUS RUNNING SHOES',
                imageUrl: 'https://media.jdsports.com/i/jdsports/924453_100_P1?$default$&w=671&&h=671',
                price: 200
            },
            {
                id: 11,
                name: 'MEN\'S NIKE AIR MAX 97 CASUAL SHOES',
                imageUrl: 'https://media.jdsports.com/i/jdsports/921826_001_P1?$default$&w=671&&h=671',
                price: 280
            },
            {
                id: 12,
                name: 'MEN\'S NIKE AIR MAX LTD 3 CASUAL SHOES ',
                imageUrl: 'https://media.jdsports.com/i/jdsports/BV1171_100_P1?$default$&w=671&&h=671',
                price: 110
            },
            {
                id: 13,
                name: 'MEN\'S NIKE AIR MAX 2015 RUNNING SHOES',
                imageUrl: 'https://media.jdsports.com/i/jdsports/DC4111_001_P1?$default$&$global_access_pdp$&layer0=[h=671&w=671&bg=rgb(237,237,237)]&h=671&w=671',
                price: 160
            },
            {
                id: 14,
                name: 'Nike Red High Tops',
                imageUrl: 'https://i.ibb.co/QcvzydB/nikes-red.png',
                price: 160
            },
            {
                id: 15,
                name: 'Nike Brown High Tops',
                imageUrl: 'https://i.ibb.co/fMTV342/nike-brown.png',
                price: 160
            },
            {
                id: 16,
                name: 'Air Jordan Limited',
                imageUrl: 'https://i.ibb.co/w4k6Ws9/nike-funky.png',
                price: 190
            },
            {
                id: 17,
                name: 'Timberlands',
                imageUrl: 'https://i.ibb.co/Mhh6wBg/timberlands.png',
                price: 200
            }
        ]
    },
    jackets: {
        id: 3,
        title: 'Jackets',
        routeName: 'jackets',
        items: [{
                id: 18,
                name: 'Black Jean Shearling',
                imageUrl: 'https://i.ibb.co/XzcwL5s/black-shearling.png',
                price: 125
            },
            {
                id: 19,
                name: 'Blue Jean Jacket',
                imageUrl: 'https://i.ibb.co/mJS6vz0/blue-jean-jacket.png',
                price: 90
            },
            {
                id: 20,
                name: 'Grey Jean Jacket',
                imageUrl: 'https://i.ibb.co/N71k1ML/grey-jean-jacket.png',
                price: 90
            },
            {
                id: 21,
                name: 'Brown Shearling',
                imageUrl: 'https://i.ibb.co/s96FpdP/brown-shearling.png',
                price: 165
            },
            {
                id: 22,
                name: 'Tan Trench',
                imageUrl: 'https://i.ibb.co/M6hHc3F/brown-trench.png',
                price: 185
            }
        ]
    },
    womens: {
        id: 4,
        title: 'Womens',
        routeName: 'womens',
        items: [{
                id: 23,
                name: 'Blue Tanktop',
                imageUrl: 'https://i.ibb.co/7CQVJNm/blue-tank.png',
                price: 25
            },
            {
                id: 24,
                name: 'Floral Blouse',
                imageUrl: 'https://i.ibb.co/4W2DGKm/floral-blouse.png',
                price: 20
            },
            {
                id: 25,
                name: 'Floral Dress',
                imageUrl: 'https://i.ibb.co/KV18Ysr/floral-skirt.png',
                price: 80
            },
            {
                id: 26,
                name: 'Red Dots Dress',
                imageUrl: 'https://i.ibb.co/N3BN1bh/red-polka-dot-dress.png',
                price: 80
            },
            {
                id: 27,
                name: 'Striped Sweater',
                imageUrl: 'https://i.ibb.co/KmSkMbH/striped-sweater.png',
                price: 45
            },
            {
                id: 28,
                name: 'Yellow Track Suit',
                imageUrl: 'https://i.ibb.co/v1cvwNf/yellow-track-suit.png',
                price: 135
            },
            {
                id: 29,
                name: 'White Blouse',
                imageUrl: 'https://i.ibb.co/qBcrsJg/white-vest.png',
                price: 20
            }
        ]
    },
    mens: {
        id: 5,
        title: 'Mens',
        routeName: 'mens',
        items: [{
                id: 30,
                name: 'Camo Down Vest',
                imageUrl: 'https://i.ibb.co/xJS0T3Y/camo-vest.png',
                price: 325
            },
            {
                id: 31,
                name: 'Floral T-shirt',
                imageUrl: 'https://i.ibb.co/qMQ75QZ/floral-shirt.png',
                price: 20
            },
            {
                id: 32,
                name: 'Black & White Longsleeve',
                imageUrl: 'https://i.ibb.co/55z32tw/long-sleeve.png',
                price: 25
            },
            {
                id: 33,
                name: 'Pink T-shirt',
                imageUrl: 'https://i.ibb.co/RvwnBL8/pink-shirt.png',
                price: 25
            },
            {
                id: 34,
                name: 'Jean Long Sleeve',
                imageUrl: 'https://i.ibb.co/VpW4x5t/roll-up-jean-shirt.png',
                price: 40
            },
            {
                id: 35,
                name: 'Burgundy T-shirt',
                imageUrl: 'https://i.ibb.co/mh3VM1f/polka-dot-shirt.png',
                price: 25
            }
        ]
    }
};

export default SHOP_DATA;