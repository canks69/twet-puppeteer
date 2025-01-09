import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ScrapingService } from './scraping.service';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { TwiterLoginDto } from './dto/twiter-login.dto';
import { ScrapePeriodDto } from './dto/scrape-period.dto';

@ApiTags('Scraping')
@Controller('scraping')
export class ScrapingController {
  constructor(private readonly scrapingService: ScrapingService) {}

  @Post('login')
  @ApiOperation({ summary: 'Login to Twitter' })
  async loginTwiter(@Body() loginDto: TwiterLoginDto) {
    const login = await this.scrapingService.loginTwiter(loginDto);
    return { message: 'Login started', data: login };
  }

  @Get('scrape')
  @ApiOperation({ summary: 'Scrape Twitter' })
  async scrape(@Query() query: ScrapePeriodDto) {
    const periodDate = new Date(query.period);
    const screep = await this.scrapingService.scrapeTwitter(periodDate);
    return { message: screep.message, data: screep.data };
  }

  @Get('posts')
  @ApiOperation({ summary: 'Get saved posts with pagination' })
  async getPosts(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.scrapingService.getPosts(page, limit);
  }
}
