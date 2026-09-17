package com.bviit.analytics.common.web;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class DocsRedirectController {

    @GetMapping({"/docs", "/docs/"})
    public String redirectToSwaggerUi() {
        return "redirect:/docs/index.html";
    }
}
