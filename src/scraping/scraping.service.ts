import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post } from './entities/post.entity';
import * as nodemailer from 'nodemailer';
import puppeteer from 'puppeteer';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { TwiterLoginDto } from './dto/twiter-login.dto';

@Injectable()
export class ScrapingService {
  constructor(
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
  ) {}

  async loginTwiter(loginDto: TwiterLoginDto) {
    const browser = await puppeteer.launch({
      headless: false,
    });

    const page = await browser.newPage();

    await page.goto('https://twitter.com/login');

    await page.waitForSelector('input[autocomplete="username"]');
    await page.type('input[autocomplete="username"]', loginDto.username);

    await page.click(
      'button[class="css-175oi2r r-sdzlij r-1phboty r-rs99b7 r-lrvibr r-ywje51 r-184id4b r-13qz1uu r-2yi16 r-1qi8awa r-3pj75a r-1loqt21 r-o7ynqc r-6416eg r-1ny4l3l"]',
    );

    await new Promise((resolve) => {
      setTimeout(resolve, 1000);
    });
    if (await page.$('input[data-testid="ocfEnterTextTextInput"]')) {
      await page.waitForSelector('input[data-testid="ocfEnterTextTextInput"]');
      await page.type(
        'input[data-testid="ocfEnterTextTextInput"]',
        loginDto.phone,
      );

      await page.click('button[data-testid="ocfEnterTextNextButton"]');
    }

    await new Promise((resolve) => {
      setTimeout(resolve, 1000);
    });
    await page.waitForSelector('input[autocomplete="current-password"]');
    await page.type(
      'input[autocomplete="current-password"]',
      loginDto.password,
    );

    await page.click('button[data-testid="LoginForm_Login_Button"]');

    await page.waitForNavigation();

    await page.goto('https://twitter.com/home');

    const cookies = await page.cookies();

    const cacheDir = path.join(__dirname, '../../cache');
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    fs.writeFileSync(
      path.join(cacheDir, 'x.com.cookies.json'),
      JSON.stringify(cookies),
    );

    await browser.close();

    return cookies;
  }

  async getPosts(page: number, limit: number) {
    return this.postRepository.find({
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  public async scrapeTwitter(period: Date) {
    const browser = await puppeteer.launch({
      headless: false,
    });
    const page = await browser.newPage();
    if (!fs.existsSync('cache/x.com.cookies.json')) {
      await browser.close();
      const response = {
        message: 'Login to Twitter first',
        data: null,
      };
      return response;
    }
    const cookies = JSON.parse(
      fs.readFileSync('cache/x.com.cookies.json', 'utf8'),
    );

    await page.setCookie(...cookies);

    page.on('console', (msg) => {
      if (msg.text().startsWith('!!!')) {
        console.log(msg.text().slice(4));
      }
    });

    await page.goto('https://x.com/coindesk');
    await page.content();

    const timeout = 60000;

    try {
      await page.waitForSelector('article[data-testid="tweet"]', { timeout });
    } catch (error) {
      await browser.close();
      throw error;
    }

    const tweets = [];
    const tweetLinks = new Set();
    const periodString = period.toISOString();
    let continueScraping = true;

    while (continueScraping) {
      const newTweets = await page.$$eval(
        'article[data-testid="tweet"]',
        (elements, periodString) =>
          elements.map((element) => {
            const tweetDate = element
              .querySelector('time')
              ?.getAttribute('datetime');

            if (
              periodString &&
              tweetDate.slice(0, 10) > periodString.slice(0, 10)
            ) {
              return;
            }

            if (
              periodString &&
              tweetDate.slice(0, 10) == periodString.slice(0, 10)
            ) {
              const tweet = {
                textContent: element.querySelector(
                  'div[data-testid="tweetText"]',
                )?.textContent,
                videoUrl:
                  element.querySelector('source')?.getAttribute('src') ?? null,
                images: Array.from(
                  element.querySelectorAll('img[alt][src]'),
                  (img) => img,
                )
                  .filter(
                    (img) =>
                      img.getAttribute('alt') !== '' &&
                      img.getAttribute('alt') !== 'Foto profil persegi',
                  )
                  .map((img) => img.getAttribute('src')),
                link: `https://x.com${element
                  .querySelector(
                    'a[class="css-146c3p1 r-bcqeeo r-1ttztb7 r-qvutc0 r-37j5jr r-a023e6 r-rjixqe r-16dba41 r-xoduu5 r-1q142lx r-1w6e6rj r-9aw3ui r-3s2u2q r-1loqt21"]',
                  )
                  ?.getAttribute('href')}`,
                createdAt: tweetDate,
              };

              return tweet;
            }

            if (
              periodString &&
              tweetDate.slice(0, 10) < periodString.slice(0, 10)
            ) {
              return 'STOP_SCRAPING';
            }
          }),
        periodString,
      );

      newTweets.forEach((tweet) => {
        if (tweet === 'STOP_SCRAPING') {
          continueScraping = false;
        } else if (tweet && tweet.link && !tweetLinks.has(tweet.link)) {
          tweetLinks.add(tweet.link);
          tweets.push(tweet);
        }
      });

      if (!continueScraping) {
        break;
      }

      await page.evaluate(() => {
        window.scrollBy(0, 100);
      });

      await new Promise((resolve) => {
        setTimeout(resolve, 100);
      });
    }

    await browser.close();

    for (const tweet of tweets) {
      const existingPost = await this.postRepository.findOne({
        where: { link: tweet.link },
      });
      if (!existingPost) {
        const post = new Post();

        if (tweet.images.length > 0) {
          tweet.images = await this.saveImage(tweet.images);
        }

        post.link = tweet.link;
        post.textContent = tweet.textContent;
        post.videoUrl = tweet.videoUrl;
        post.images = tweet.images;
        post.createdAt = new Date(tweet.createdAt);
        await this.postRepository.save(post);
      }
    }

    const response = {
      message: 'Scraping completed',
      data: tweets,
    };

    return response;
  }

  private async saveImage(imageUrls: string[]): Promise<string[]> {
    const dir = 'content/images';
    await fs.promises.mkdir(dir, { recursive: true });

    const savedFilenames: string[] = [];

    for (const imageUrl of imageUrls) {
      const response = await fetch(imageUrl);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      let filename = imageUrl.split('/').pop();
      const url = new URL(imageUrl);
      const format = url.searchParams.get('format');
      filename = `${filename?.split('?')[0]}${format ? `.${format}` : ''}`;
      await fs.promises.writeFile(`${dir}/${filename}`, buffer);
      savedFilenames.push(filename);
    }

    return savedFilenames;
  }

  private async sendEmail(postUrl: string) {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.NOTIFY_EMAIL,
      subject: 'New Post with Video',
      text: `A new post with a video has been uploaded. Check it here: ${postUrl}`,
    });
  }
}
