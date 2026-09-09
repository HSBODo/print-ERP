package com.bviit.analytics.common.web;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class SpaForwardController {

    @GetMapping({
        "/",
        "/login",
        "/stats/{path:[^\\.]*}",
        "/stats/{path:[^\\.]*}/{subpath:[^\\.]*}",
        "/accounting/{path:[^\\.]*}",
        "/admin/{path:[^\\.]*}",
        "/report/{path:[^\\.]*}"
    })
    public String forward() {
        return "forward:/index.html";
    }
}
