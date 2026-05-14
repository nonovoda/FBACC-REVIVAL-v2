
/* =============================================================================
 * SECTION 0: BOOTSTRAP & ENTRY POINT
 * Version: 6.4  |  IIFE wrapper, URL path guard, ESC key listener
 * Runs only on: /adsmanager/manage/campaigns (and variants)
 * If wrong page: redirects to /adsmanager/manage/campaigns
 * ============================================================================= */

(function () {
  window.adsplugver = "6.4";
  if (
    location.pathname == "/adsmanager/manage/campaigns" ||
    location.pathname == "/ads/creativehub/home/" ||
    location.pathname == "/adsmanager/manage/all" ||
    location.pathname == "/adsmanager/manage/ads" ||
    location.pathname == "/adsmanager/manage/adsets"
  ) {
    if (document.getElementById("notif") == null) {
      document.onkeydown = function (evt) {
        evt = evt || window.event;
        if (evt.keyCode == 27) {
          window.mainclose();
        }
      };

/* =============================================================================
 * SECTION 1: GLOBALS & CONSTANTS
 * window.currency_symbols — lookup table for 15 currencies
 * window.adsplugver = "6.4"
 * window.privateToken, window.dtsg, window.socid, window.selectedacc, etc.
 * ============================================================================= */

      window.currency_symbols = {
        USD: "$", // US Dollar
        EUR: "€", // Euro
        CRC: "₡", // Costa Rican Colón
        GBP: "£", // British Pound Sterling
        ILS: "₪", // Israeli New Sheqel
        INR: "₹", // Indian Rupee
        JPY: "¥", // Japanese Yen
        KRW: "₩", // South Korean Won
        NGN: "₦", // Nigerian Naira
        PHP: "₱", // Philippine Peso
        PLN: "zł", // Polish Zloty
        PYG: "₲", // Paraguayan Guarani
        THB: "฿", // Thai Baht
        UAH: "₴", // Ukrainian Hryvnia
        VND: "₫", // Vietnamese Dong
      };

/* =============================================================================
 * SECTION 2: AUTH & TOKEN EXTRACTION
 * checkauth()          — warns if logged in as a Page (i_user cookie present)
 * getAccessTokenFunc() — scrapes EA... access token + fb_dtsg + socid from
 *                        inline <script> tags via regex on innerHTML.
 *                        Also extracts spin_r/b/t, hsi, shortname, fullname.
 * NOTE: Uses FB internal require() — fragile, breaks on every FB deploy.
 * ============================================================================= */

      window.checkauth = function () {
        if (window.pageauth == true)
          window.appendtab(
            "<hr width='90%'><center><b style='color:red;'> You need to <button style='background:#384959;color:white;' onclick=" +
              `window.open('https://www.facebook.com/forced_account_switch','popUpWindow','height=500,width=900'); return false;` +
              ">switch</button> to personal profile to continue!</b></center>",
            "dblock2",
          );
      };

      window.getAccessTokenFunc = function () {
        console.log("check auth user");
        if (window.getCookie("i_user") !== undefined) {
          window.pageauth = true;
        } else window.pageauth = false;
        console.log("is page auth? = " + window.pageauth);
        console.log("looking for token");
        scripts = document.getElementsByTagName("script");
        let i = 0;
        let token = "";
        let selacc = window.getURLParameter("act");
        var elementIdRegEx = /selected_account_id:"(.*?)"/gi;
        for (; i < scripts.length; i = i + 1) {
          html = scripts[i].innerHTML;
          regex = /"EA[A-Za-z0-9]{20,}/gm;
          if (html.search(regex) > 1) {
            match = html.match(regex);
            token = match[0].substr(1);
            window.privateToken = token;
          }
          if (!selacc) {
            console.log("no get acc parameter");
            if (html.search(elementIdRegEx) > 1) {
              let htmlAsset = elementIdRegEx.exec(html);
              console.log("selected acc found");
              window.selectedacc = htmlAsset[1];
            }
          } else {
            window.selectedacc = selacc;
          }
          let tmpdtsg =
              require("DTSGInitialData").token ||
              document.querySelector('[name="fb_dtsg"]').value,
            tmpsocid =
              require("CurrentUserInitialData").USER_ID ||
              [removed].match(/c_user=([0-9]+)/)[1];
          let spinR = require(["SiteData"]).__spin_r;
          let spinB = require(["SiteData"]).__spin_b;
          let spinT = require(["SiteData"]).__spin_t;
          let hsi = require(["SiteData"]).hsi;
          let shortname = require(["CurrentUserInitialData"]).SHORT_NAME;
          let fullname = require(["CurrentUserInitialData"]).NAME;
          if (tmpdtsg) window.dtsg = tmpdtsg;
          if (tmpsocid) window.socid = tmpsocid;
          if (spinR) window.spinR = spinR;
          if (spinB) window.spinB = spinB;
          if (spinT) window.spinT = spinT;
          if (hsi) window.hsi = hsi;
          if (shortname) window.shortname = shortname;
          if (fullname) window.fullname = fullname;
        }
      };


/* =============================================================================
 * SECTION 3: PAYMENTS — CREDIT CARD ADDITION
 * addCCtoadAccReq2(adAccId, fbSocId, ccNumber, ccYear, ccMonth, ccCVC, ccIso, token)
 *   Sends raw CC data via useBillingAddCreditCardMutation
 *   Endpoint: business.secure.facebook.com/ajax/payment/token_proxy.php
 *   doc_id: 4126726757375265
 *   RISK: full card number transmitted in POST body, hardcoded __rev/spin values
 * addCCtoadAccForm()        — shows CC input form
 * addCCtoadAccProcessForm() — reads form and calls addCCtoadAccReq2()
 * ============================================================================= */

      window.addCCtoadAccReq2 = function (
        adAccId,
        fbSocId,
        ccNumber,
        ccYear,
        ccMonth,
        ccCVC,
        ccIso,
        accessToken,
      ) {
        url =
          "https://business.secure.facebook.com/ajax/payment/token_proxy.php?tpe=%2Fapi%2Fgraphql%2F";
        ccNumber = ccNumber.replace(" ", "");
        first6 = ccNumber.substring(0, 6);
        last4 = ccNumber.substring(12);
        var myHeaders = new Headers();
        //myHeaders.append("Authorization", "OAuth " + accessToken);
        myHeaders.append("sec-fetch-site", "same-site");
        myHeaders.append("sec-fetch-mode", "cors");
        myHeaders.append("Content-Type", "application/x-www-form-urlencoded");

        var urlencoded = new URLSearchParams();
        urlencoded.append("av", fbSocId);
        urlencoded.append("payment_dev_cycle", "prod");
        urlencoded.append("locale", "en_US");
        urlencoded.append("__user", fbSocId);
        urlencoded.append("__a", "1");
        urlencoded.append("dpr", "2");
        urlencoded.append("__rev", "1005599768");
        urlencoded.append("__comet_req", "0");
        urlencoded.append("__spin_r", "1005599768");
        urlencoded.append("__jssesw", "1");
        urlencoded.append("fb_dtsg", window.dtsg);
        urlencoded.append("fb_api_caller_class", "RelayModern");
        urlencoded.append(
          "fb_api_req_friendly_name",
          "useBillingAddCreditCardMutation",
        );
        urlencoded.append("make_ads_primaty_funding_source", "1");
        urlencoded.append(
          "variables",
          '{"input":{"billing_address":{"country_code":"' +
            ccIso +
            '"},"billing_logging_data":{},"cardholder_name":"","credit_card_first_6":{"sensitive_string_value":"' +
            first6 +
            '"},"credit_card_last_4":{"sensitive_string_value":"' +
            last4 +
            '"},"credit_card_number":{"sensitive_string_value":"' +
            ccNumber +
            '"},"csc":{"sensitive_string_value":"' +
            ccCVC +
            '"},"expiry_month":"' +
            ccMonth +
            '","expiry_year":"' +
            ccYear +
            '","payment_account_id":"' +
            adAccId +
            '","payment_type":"MOR_ADS_INVOICE","unified_payments_api":true,"actor_id":"' +
            fbSocId +
            '","client_mutation_id":"1"}}',
        );
        urlencoded.append("server_timestamps", "true");
        urlencoded.append("doc_id", "4126726757375265");

        let requestOptions = {
          method: "POST",
          headers: myHeaders,
          body: urlencoded,
          mode: "cors",
          credentials: "include",
          redirect: "follow",
        };

        fetch(url, requestOptions)
          .then(function (response) {
            var card = response.json();
            return card;
          })
          .then(function (result) {
            //vm.progressModal(100);
            if (result.add_credit_card !== null) {
              console.log(result);
              window.mainreload();
            } else {
              if (result.errors[0].description)
                alert(result.errors[0].description);
              console.log(result);
            }
          })
          .catch(function (error) {
            console.log("error");
            console.log(result);
            alert("error req :( ");
          });
      };

      window.addCCtoadAccForm = function () {
        document.getElementById("dblock1ccform").style.display = "inline";
      };
      window.addCCtoadAccProcessForm = function () {
        document.getElementById("addCCtoadAccProcessForm").innerText =
          "Please Wait";
        getccNumberval = document.getElementById("ccNumber").value;
        getccCVCval = document.getElementById("ccCVC").value;
        getccMonthval = document.getElementById("ccMonth").value;
        getccYearval = document.getElementById("ccYear").value;
        getccIsoval = document.getElementById("ccIso").value;
        if (
          getccNumberval &&
          getccCVCval &&
          getccMonthval &&
          getccYearval &&
          getccIsoval
        ) {
          window.addCCtoadAccReq2(
            window.selectedacc,
            window.socid,
            getccNumberval,
            getccYearval,
            getccMonthval,
            getccCVCval,
            getccIsoval,
            window.privateToken,
          );
        } else {
          alert("not all fields are filled");
        }
      };


/* =============================================================================
 * SECTION 4: AD ACCOUNT SETTINGS EDITOR
 * ShowEditcurr() / ProcessEditcurr() — edit currency via graph v19.0 PATCH
 * ShowEdittzone() / ProcessEdittzone() — edit timezone via graph v19.0 PATCH
 * NOTE: FB API may reject currency/timezone edits on active accounts.
 * ============================================================================= */

      window.ShowEditcurr = function () {
        document.getElementById("fbaccstatusacccurrdiv").style.display = "none";
        document.getElementById("fbaccstatusacccurrformdiv").style.display =
          "inline";
      };
      window.ProcessEditcurr = async function () {
        document.getElementById("fbaccstatusacccurrformdivgo").innerText =
          "Wait..";
        getNewCurrVal = document.getElementById(
          "fbaccstatusacccurrselect",
        ).value;
        let apiUrl = "https://graph.facebook.com/v19.0/";
        let editaccid = window.selectedacc;
        let params = `act_${editaccid}?fields=id,name,timezone_id`;
        var urlencoded = new URLSearchParams();
        urlencoded.append("currency", getNewCurrVal);
        urlencoded.append("access_token", window.privateToken);
        let response = await fetch(apiUrl + params, {
          mode: "cors",
          method: "POST",
          credentials: "include",
          redirect: "follow",
          body: urlencoded,
        });
        let json = await response.json();
        console.log(json);
        if (json.error !== undefined) {
          alert(json.error.error_user_msg);
          document.getElementById("fbaccstatusacccurrformdivgo").innerText =
            "Error";
        } else {
          //Reload
          window.mainreload();
        }
      };


/* =============================================================================
 * SECTION 5: APPEALS
 * appealadcreo(adgroupappid) — appeal ad creative rejection
 *   Endpoint: /ads/ajax/ads_appeal_creative/ (legacy, likely broken)
 *   Uses hardcoded __rev and __comet_req params
 * appealadsacc(accid)        — appeal disabled ad account
 *   GraphQL doc_id: 5197966936890203
 *   Hardcoded appeal_comment: "I'm not sure which policy was violated."
 * appealfp(accid)            — appeal Facebook Page restriction
 *   Same GraphQL mutation as appealadsacc (doc_id: 5197966936890203)
 *   RISK: hardcoded generic comment sent on every appeal.
 * ============================================================================= */

      window.appealadcreo = async function (adgroupappid) {
        document.getElementById("MainAppeal" + adgroupappid).innerText =
          "Wait..";
        //getNewCurrVal = document.getElementById("fbaccstatusacccurrselect").value;
        let apiUrl =
          "https://business.facebook.com/ads/integrity/appeals/creation/ajax/";

        //	let params = `act_${editaccid}?fields=id,name,timezone_id`;
        //	var urlencoded = new URLSearchParams();

        let response = await fetch(apiUrl, {
          headers: {
            accept: "*/*",
            "accept-language": "en-US,en;q=0.9",
            "content-type": "application/x-www-form-urlencoded",
          },
          body: `adgroup_id=${adgroupappid}&callsite=ADS_MANAGER&__hs=19153.BP:ads_manager_pkg.2.0.0.0.&__user=${window.socid}&__csr=&dpr=2&__ccg=EXCELLENT&__rev=1005666349&__comet_req=0&fb_dtsg=${window.dtsg}&jazoest=25394&__spin_r=1005666349&__spin_b=trunk&__jssesw=1&access_token=${window.privateToken}`,
          mode: "cors",
          method: "POST",
          credentials: "include",
          redirect: "follow",
        });
        let json = await response;
        console.log(json);
        document.getElementById("MainAppeal" + adgroupappid).innerText =
          "Error";
        document.getElementById("MainAppeal" + adgroupappid).disabled = true;
      };

      window.appealadsacc = async function (accid) {
        document.getElementById("AdsAccAppeal" + accid).innerText = "Wait..";

        let apiUrl = "https://www.facebook.com/api/graphql/";
        var urlencoded = new URLSearchParams();
        urlencoded.append("__rev", window.spinR);
        urlencoded.append("__hsi", window.hsi);
        urlencoded.append("__spin_r", window.spinR);
        urlencoded.append("__spin_b", window.spinB);
        urlencoded.append("__spin_t", window.spinT);
        urlencoded.append("fb_api_caller_class", "RelayModern");
        urlencoded.append(
          "fb_api_req_friendly_name",
          "useAdAccountALRAppealMutation",
        );
        urlencoded.append("av", window.socid);
        urlencoded.append("__user", window.socid);
        ///urlencoded.append("session_id", '');
        urlencoded.append("fb_dtsg", window.dtsg);
        urlencoded.append(
          "variables",
          `{"input":{"client_mutation_id":"1","actor_id":"${accid}","ad_account_id":"${accid}","ids_issue_ent_id":"1","appeal_comment":"I'm not sure which policy was violated.","callsite":"ACCOUNT_QUALITY"}}`,
        );
        urlencoded.append("doc_id", "5197966936890203");
        urlencoded.append("server_timestamps", "true");

        let response = await fetch(apiUrl, {
          mode: "cors",
          method: "POST",
          credentials: "include",
          redirect: "follow",
          body: urlencoded,
        });
        let json = await response.json();
        if (json.errors !== undefined) {
          alert("Error appeal :(");
          document.getElementById("AdsAccAppeal" + accid).innerText = "Error";
          document.getElementById("AdsAccAppeal" + accid).disabled = true;
        } else {
          if (json.data.xfb_alr_ad_account_appeal_create.success == true) {
            document.getElementById("AdsAccAppeal" + accid).innerText = "Ok";
            document.getElementById("AdsAccAppeal" + accid).disabled = true;
          } else {
            alert(
              "Success: " +
                json.data.xfb_alr_ad_account_appeal_create.success +
                "\n\nOpen the accountquality tab. Maybe appeal requires an ID check...",
            );
            document.getElementById("AdsAccAppeal" + accid).innerText = "False";
            document.getElementById("AdsAccAppeal" + accid).disabled = true;
          }
        }
      };

      window.appealfp = async function (accid) {
        document.getElementById("FPAppeal" + accid).innerText = "Wait..";

        let apiUrl = "https://www.facebook.com/api/graphql/";
        var urlencoded = new URLSearchParams();
        urlencoded.append("__rev", window.spinR);
        urlencoded.append("__hsi", window.hsi);
        urlencoded.append("__spin_r", window.spinR);
        urlencoded.append("__spin_b", window.spinB);
        urlencoded.append("__spin_t", window.spinT);
        urlencoded.append("fb_api_caller_class", "RelayModern");
        urlencoded.append(
          "fb_api_req_friendly_name",
          "useAdAccountALRAppealMutation",
        );
        urlencoded.append("av", window.socid);
        urlencoded.append("__user", window.socid);
        ///urlencoded.append("session_id", '');
        urlencoded.append("fb_dtsg", window.dtsg);
        urlencoded.append(
          "variables",
          `{"input":{"client_mutation_id":"1","actor_id":"${accid}","ad_account_id":"${accid}","ids_issue_ent_id":"1","appeal_comment":"I'm not sure which policy was violated.","callsite":"ACCOUNT_QUALITY"}}`,
        );
        urlencoded.append("doc_id", "5197966936890203");
        urlencoded.append("server_timestamps", "true");

        let response = await fetch(apiUrl, {
          mode: "cors",
          method: "POST",
          credentials: "include",
          redirect: "follow",
          body: urlencoded,
        });
        let json = await response.json();
        if (json.errors !== undefined) {
          alert("Error appeal :(");
          document.getElementById("FPAppeal" + accid).innerText = "Error";
          document.getElementById("FPAppeal" + accid).disabled = true;
        } else {
          if (json.data.xfb_alr_ad_account_appeal_create.success == true) {
            document.getElementById("FPAppeal" + accid).innerText = "Ok";
            document.getElementById("FPAppeal" + accid).disabled = true;
          } else {
            alert(
              "Success: " +
                json.data.xfb_alr_ad_account_appeal_create.success +
                "\n\nOpen the accountquality tab. Maybe appeal requires an ID check...",
            );
            document.getElementById("FPAppeal" + accid).innerText = "False";
            document.getElementById("FPAppeal" + accid).disabled = true;
          }
        }
      };


/* =============================================================================
 * SECTION 6: DESTRUCTIVE ACCOUNT OPERATIONS  *** HIGH RISK ***
 * delfp(fpid)          — DELETE a Facebook Page
 *   GraphQL doc_id: 4899485650107392 (PagesCometDeletePageMutation) ACTIVE
 *   Also has unhidefp() which uses doc_id: 4920939114687785 (publish)
 * deladacc(adaccid)    — Schedule ad account for CLOSURE
 *   Endpoint: /ads/ajax/account_close/ (legacy AJAX, response not checked)
 * remadacc(adaccid, rmid) — Remove user from ad account
 *   Endpoint: graph v19.0 DELETE /act_{id}/users/{userid}
 *   BUG: sends method=DELETE in body but uses GET method in fetch()
 * ============================================================================= */

      window.delfp = async function (fpid) {
        if (
          confirm(
            "Are you sure you want to permanently delete facebook page: " +
              fpid +
              "?",
          )
        ) {
          let apiUrl = "https://www.facebook.com/api/graphql/";
          var urlencoded = new URLSearchParams();
          urlencoded.append("__rev", window.spinR);
          urlencoded.append("__hsi", window.hsi);
          urlencoded.append("__spin_r", window.spinR);
          urlencoded.append("__spin_b", window.spinB);
          urlencoded.append("__spin_t", window.spinT);
          urlencoded.append("fb_api_caller_class", "RelayModern");
          urlencoded.append(
            "fb_api_req_friendly_name",
            "usePagesCometDeletePageMutation",
          );
          urlencoded.append("av", window.socid);
          urlencoded.append("__user", window.socid);
          ///urlencoded.append("session_id", '');
          urlencoded.append("fb_dtsg", window.dtsg);
          urlencoded.append(
            "variables",
            `{"input":{"client_mutation_id":"1","actor_id":"${window.socid}","page_id":"${fpid}"}}`,
          );
          urlencoded.append("doc_id", "4899485650107392");
          urlencoded.append("server_timestamps", "true");
          let response = await fetch(apiUrl, {
            mode: "cors",
            method: "POST",
            credentials: "include",
            redirect: "follow",
            body: urlencoded,
          });
          let json = await response.json();
          if (json.errors !== undefined) {
            alert("Error req :(");
          } else {
            alert("Page is scheduled to be deleted in 14 days....");
            window.showfpstatus();
          }
        }
      };

      window.deladacc = async function (adaccid) {
        if (
          confirm(
            "Are you sure you want to close this account: " + adaccid + "?",
          )
        ) {
          let apiUrl =
            "https://" + location.hostname + "/ads/ajax/account_close/";
          var urlencoded = new URLSearchParams();
          urlencoded.append("__rev", window.spinR);
          urlencoded.append("__hsi", window.hsi);
          urlencoded.append("__spin_r", window.spinR);
          urlencoded.append("__spin_b", window.spinB);
          urlencoded.append("__spin_t", window.spinT);
          // urlencoded.append("fb_api_caller_class", "RelayModern");
          // urlencoded.append("fb_api_req_friendly_name", "usePagesCometDeletePageMutation");
          // urlencoded.append("av", window.socid);
          urlencoded.append("__user", window.socid);
          urlencoded.append("account_id", adaccid);
          urlencoded.append("fb_dtsg", window.dtsg);
          //urlencoded.append("variables", `{"input":{"client_mutation_id":"1","actor_id":"${window.socid}","page_id":"${fpid}"}}`);
          // urlencoded.append("doc_id", '4899485650107392');
          // urlencoded.append("server_timestamps", 'true');
          let response = await fetch(apiUrl, {
            mode: "cors",
            method: "POST",
            credentials: "include",
            redirect: "follow",
            body: urlencoded,
          });
          //let json = await response.json();
          //	 if (json.errors !== undefined) {
          //		 alert('Error req :(');
          //	 }else {
          alert("Ads Account is scheduled to be close....");
          window.showaccstatus();
          // }
        }
      };

      window.remadacc = async function (adaccid, rmid) {
        if (
          confirm(
            "Are you sure you want to remove this account: " + adaccid + "?",
          )
        ) {
          //let apiUrl = "https://"+location.hostname+"/ads/manage/settings/remove_user/?userid="+window.socid+"&act="+adaccid+"&is_new_account_settings=1";
          let apiUrl =
            "https://graph.facebook.com/v19.0/act_" +
            adaccid +
            "/users/" +
            rmid +
            "?method=delete&access_token=" +
            window.privateToken;
          //console.log(apiUrl);
          var urlencoded = new URLSearchParams();
          urlencoded.append("method", "DELETE");
          //urlencoded.append("fb_dtsg", window.dtsg);
          //urlencoded.append("variables", `{"input":{"client_mutation_id":"1","actor_id":"${window.socid}","page_id":"${fpid}"}}`);
          // urlencoded.append("doc_id", '4899485650107392');
          // urlencoded.append("server_timestamps", 'true');
          urlencoded.append("access_token", window.privateToken);
          let response = await fetch(apiUrl, {
            headers: {
              accept: "*/*",
              "accept-language": "en-US,en;q=0.9",
              "content-type": "application/x-www-form-urlencoded",
            },
            referrer:
              "https://adsmanager.facebook.com/ads/manager/account_settings/information/?act=1196425337914345&pid=p1&page=account_settings&tab=account_information",
            referrerPolicy: "origin-when-cross-origin",
            mode: "cors",
            method: "GET",
            credentials: "include",
            redirect: "follow",
            referrerPolicy: "same-origin",
            //body: urlencoded
          });
          let json = await response.json();
          if (json.error !== undefined) {
            // alert('Error req :(');
            alert(json.error.message);
          } else {
            alert("Ads Account is removed....");
            window.showaccstatus();
          }
        }
      };

      window.unhidefp = async function (fpid) {
        if (confirm("Are you sure you want to publish page: " + fpid + " ?")) {
          let apiUrl = "https://www.facebook.com/api/graphql/";
          var urlencoded = new URLSearchParams();
          urlencoded.append("__rev", window.spinR);
          urlencoded.append("__hsi", window.hsi);
          urlencoded.append("__spin_r", window.spinR);
          urlencoded.append("__spin_b", window.spinB);
          urlencoded.append("__spin_t", window.spinT);
          urlencoded.append("fb_api_caller_class", "RelayModern");
          urlencoded.append(
            "fb_api_req_friendly_name",
            "usePagesCometEditPageVisibilityMutation",
          );
          urlencoded.append("av", window.socid);
          urlencoded.append("__user", window.socid);
          ///urlencoded.append("session_id", '');
          urlencoded.append("fb_dtsg", window.dtsg);
          urlencoded.append(
            "variables",
            `{"input":{"client_mutation_id":"1","actor_id":"${window.socid}","page_id":"${fpid}","publish_mode":"PUBLISHED"}}`,
          );
          urlencoded.append("doc_id", "4920939114687785");
          urlencoded.append("server_timestamps", "true");
          let response = await fetch(apiUrl, {
            mode: "cors",
            method: "POST",
            credentials: "include",
            redirect: "follow",
            body: urlencoded,
          });
          let json = await response.json();
          if (json.errors !== undefined) {
            alert("Error req :(");
          } else {
            window.showfpstatus();
          }
        }
      };

      window.ShowEdittzone = function () {
        document.getElementById("fbaccstatusacctzonediv").style.display =
          "none";
        document.getElementById("fbaccstatusacctzoneformdiv").style.display =
          "block";
      };
      window.ProcessEdittzone = async function () {
        document.getElementById("fbaccstatusacctzoneformdivgo").innerText =
          "Wait..";
        getNewTzVal = document.getElementById(
          "fbaccstatusacctzoneselect",
        ).value;
        let apiUrl = "https://graph.facebook.com/v19.0/";
        let editaccid = window.selectedacc;
        let params = `act_${editaccid}?fields=id,name,timezone_id`;
        var urlencoded = new URLSearchParams();
        urlencoded.append("timezone_id", getNewTzVal);
        urlencoded.append("access_token", window.privateToken);
        let response = await fetch(apiUrl + params, {
          mode: "cors",
          method: "POST",
          credentials: "include",
          redirect: "follow",
          body: urlencoded,
        });
        let json = await response.json();
        console.log(json);
        if (json.error !== undefined) {
          alert(json.error.error_user_msg);
          document.getElementById("fbaccstatusacctzoneformdivgo").innerText =
            "Error";
        } else {
          //Reload
          window.mainreload();
        }
      };


/* =============================================================================
 * SECTION 7: UTILITIES & HELPERS
 * getJSON(url, callback, type) — XHR wrapper, type="json"|"text"
 * checkIpFunc()   — fetches /diagnostics and dumps raw HTML to tab4
 * checkVerFunc()  — checks plugin version via graph object 4565016393523068
 *                   Updates #plugupdate indicator if newer version exists
 *                   Also displays update description from data.description
 * getURLParameter(name) — reads URL query param
 * getCookie(name)       — reads cookie by name
 * copytocb(text)        — copies text to clipboard
 * shadowtext(divid)     — blurs text in DOM element (privacy mode)
 * ============================================================================= */

      window.getJSON = function (url, callback, type) {
        var xhr = new XMLHttpRequest();
        xhr.withCredentials = true;
        xhr.open("GET", url, true);
        if (!type) xhr.responseType = "json";
        else xhr.responseType = type;
        xhr.onload = function () {
          var status = xhr.status;
          if (status === 200) {
            callback(null, xhr.response);
          } else {
            callback(status, xhr.response);
          }
        };
        xhr.send();
      };

      window.checkIpFunc = function () {
        if (location.origin == "https://www.facebook.com") {
          diag = "https://www.facebook.com/diagnostics";
        } else {
          diag = "https://business.facebook.com/diagnostics";
        }
        window.getJSON(
          diag,
          function (err, data) {
            if (err !== null) {
              alert("Something went wrong: " + err);
            } else {
              console.log(data);
              window.appendtab("<p class='prep'>" + data + "</p>", "tab4");
            }
          },
          "text",
        );
      };

      window.checkVerFunc = function () {
        verreq =
          "https://graph.facebook.com/v19.0/4565016393523068?fields=id,title,description&access_token=" +
          window.privateToken;
        window.getJSON(
          verreq,
          function (err, data) {
            if (err !== null) {
              alert("Something went wrong: " + err);
            } else {
              if (data.title != window.adsplugver) {
                document.getElementById("plugupdate").innerHTML =
                  '<a style="color:yellow;" href="https://fbacc.io" target="_blank">&#128165;</a> ';
              }
              if (data.description) {
                document.getElementById("fbplugads").innerHTML =
                  "<span>" +
                  data.description +
                  '</span><a class="close" style="position: absolute;bottom: 10px;right: 20px;transition: all 200ms;font-size: 14px;font-weight: bold;text-decoration: none;color: #333;" onclick="window.mainclosead();" href="#">&#xd7;</a>';
              }
            }
          },
          "json",
        );
      };

/* =============================================================================
 * SECTION 8: PAGE ACCESS TOKENS
 * getPageToken(page_id)        — fetch page access_token via graph v19.0
 * getAndCopyPageToken(page_id) — fetch and auto-copy to clipboard
 * ============================================================================= */

      window.getPageToken = async function (page_id) {
        let apiUrl = "https://graph.facebook.com/v19.0/";

        let response = await fetch(
          `${apiUrl}${page_id}?fields=access_token&access_token=${window.privateToken}`,
          {
            mode: "cors",
            method: "GET",
            credentials: "include",
            redirect: "follow",
          },
        );

        let rez = await response.json();
        if (rez.access_token !== undefined) return rez.access_token;

        return false;
      };

      window.getAndCopyPageToken = async function (page_id) {
        let token = await window.getPageToken(page_id);
        if (token === false) {
          console.log(`page token error`);
          return false;
        }

        await window.copytocb(token);
        return token;
      };

      /*##################private section################*/

      /*##################endprivate#############*/

      ////////////////////////////morePopup//////////////////////////////////
      let pluginPopupId = "notif-pop";
      let pluginPopupTitleId = `${pluginPopupId}-title`;
      let pluginPopupContentId = `${pluginPopupId}-content`;


/* =============================================================================
 * SECTION 9: POPUP / MODAL SYSTEM
 * initPluginPopup(event, content, title) — creates floating popup container
 * showPluginPopup(event, content, title) — shows/positions popup
 * hidePluginPopup()                      — hides popup
 * toglePluginPopup()                     — toggles visibility
 * destroyPluginPopup()                   — removes popup from DOM
 * getPopupCoords(event)                  — calculates popup position
 * ============================================================================= */

      window.initPluginPopup = function (event, content, title) {
        //console.log(event);
        var div = document.getElementById(pluginPopupId);
        title ??= "popup";
        let coords = getPopupCoords(event);
        if (!div) {
          div = document.createElement("div");
          div.id = pluginPopupId;
          div.setAttribute(
            "style",
            `
			   position: absolute;
			   z-index: 100000;
			   background-color: #f1f1f1;
			   border: 1px solid #d3d3d3;
			   display: block;
			   top: ${coords.top}px;
			   left: ${coords.left}px;
			   min-width:200px;
		   `,
          );
        }
        div.innerHTML = `
		   <div style="padding: 5px; background-color: #384959; color: #fff; font-size: 15px;font-weight: bold;text-decoration: none;">
			<div id="${pluginPopupId}-header" style="background-color:#7FB5DA; color: #333; margin: -5px">
				<center>
				<div id="${pluginPopupTitleId}" >
					${title}
				</div>
				</center>
				<div style=''>
					<a class="close"
				style="position: absolute;top: -2px;right: 5px;transition: all 200ms; color: #333; font-size: 20px;"
				onclick="window.hidePluginPopup();"
				href="#">×</a>
				</div>
			</div>
		   <div id="${pluginPopupContentId}" style="padding: 10px">
			   ${content}
		   </div>
		   </div>
	   `;
        div.style.display = "block";
        document.getElementById("notif-overlay").append(div);
        dragElement(div);
      };
      window.showPluginPopup = function (event, content, title = null) {
        var div = document.getElementById(pluginPopupId);
        //console.log('showPluginPopup fired');
        if (div) {
          //console.log('popup exist');
          let coords = window.getPopupCoords(event);
          div.style.display = "block";
          div.style.top = `${coords.top}px`;
          div.style.left = `${coords.left}px`;
          document.getElementById(pluginPopupTitleId).innerHTML = title;
          document.getElementById(pluginPopupContentId).innerHTML = content;
        } else {
          //console.log('popup init');
          window.initPluginPopup(event, content, title);
        }
      };

      window.hidePluginPopup = function () {
        var div = document.getElementById(pluginPopupId);
        if (div) div.style.display = "none";
      };
      window.toglePluginPopup = function () {
        var div = document.getElementById(pluginPopupId);
        if (div && div.style.display == "none") {
          div.style.display = "block";
        } else if (div && div.style.display == "block") {
          div.style.display = "none";
        }
      };

      window.destroyPluginPopup = function () {
        document.getElementById(pluginPopupId)?.remove();
        window.popupCoords.init = false;
      };

      function dragElement(elmnt) {
        var pos1 = 0,
          pos2 = 0,
          pos3 = 0,
          pos4 = 0;
        if (document.getElementById(elmnt.id + "-header")) {
          /* if present, the header is where you move the DIV from:*/
          document.getElementById(elmnt.id + "-header").onmousedown =
            dragMouseDown;
        } else {
          /* otherwise, move the DIV from anywhere inside the DIV:*/
          elmnt.onmousedown = dragMouseDown;
        }

        function dragMouseDown(e) {
          e = e || window.event;
          e.preventDefault();
          // get the mouse cursor position at startup:
          pos3 = e.clientX;
          pos4 = e.clientY;
          document.onmouseup = closeDragElement;
          // call a function whenever the cursor moves:
          document.onmousemove = elementDrag;
        }

        function elementDrag(e) {
          e = e || window.event;
          e.preventDefault();
          // calculate the new cursor position:
          pos1 = pos3 - e.clientX;
          pos2 = pos4 - e.clientY;
          pos3 = e.clientX;
          pos4 = e.clientY;
          // set the element's new position:
          elmnt.style.top = elmnt.offsetTop - pos2 + "px";
          elmnt.style.left = elmnt.offsetLeft - pos1 + "px";
        }

        function closeDragElement() {
          /* stop moving when mouse button is released:*/
          document.onmouseup = null;
          document.onmousemove = null;
        }
      }

      window.popupCoords = { left: 10, top: 10, init: false };
      window.getPopupCoords = function (event) {
        if (event === undefined) event = {};

        if (!window.popupCoords.init) {
          console.log("popupCoords init");
          let parentBox = document
            .getElementById("notif")
            .getBoundingClientRect();
          window.popupCoords.left = parentBox.left + 10;
          window.popupCoords.top = parentBox.top + 10;
          window.popupCoords.init = true;
          document
            .getElementById("notif")
            .addEventListener("mousemove", (event) => {
              // console.log(`top: ${event.pageY}px; left: ${event.pageX}px;`);
              window.popupCoords.left = event.pageX;
              window.popupCoords.top = event.pageY;
            });
        }

        //console.log('event', event.pageX);
        let left =
          event.pageX !== undefined ? event.pageX : window.popupCoords.left;
        let top =
          event.pageY !== undefined ? event.pageY : window.popupCoords.top;
        //console.log(`left: ${left}, top: ${top}`);

        return { left: left, top: top };
      };
      ////////////////////////////morePopup//////////////////////////////////


/* =============================================================================
 * SECTION 10: FACEBOOK PAGES — CREATE & LIST
 * showAddFP()        — renders Create Page form in tab4
 *   NEW style: doc_id 4722866874428654 (AdditionalProfilePlusCreationMutation)
 *   OLD style: doc_id 9339938679410311 (page_create)
 * AddFPProcessForm() — submits creation mutation
 * PzrdFPList()       — compact Page quality list (PZRD mode)
 *   via graph v19.0/me?fields=accounts.limit(200)
 * PzrdSocList()      — social account status list
 * PzrdBmList(bmid)   — BM account list
 *   via graph v19.0/{bmid}/adaccounts
 * ============================================================================= */

      window.showAddFP = function () {
        document.getElementById("showAddFPbtn").style.display = "none";
        let addbmNode = document.getElementById("tab4showadd");
        let todo = "";
        todo =
          todo +
          `<table border="0.1"><tr><td>Category:</td> <td><select style="background: #384959;color:white;" id="Tab4AddFPcat">
			   <option value="164886566892249">Advertising Agency</option>
			   <option value="1757592557789532">Advertising</option>
			   <option value="187393124625179">Web Designer</option>
			   <option value="530553733821238">Social Media Agency</option>
			   <option value="162183907165552">Graphic Designer</option>
			   <option value="145118935550090">Medical</option>
			   <option value="134381433294944">Pharmacy</option>
			   <option value="187724814583579">Casino</option>
			   <option value="273819889375819">Restaurant</option>
			   <option value="198327773511962">Real Estate</option>
			   <option value="1706730532910578">Internet Marketing Service</option>
			   <option value="471120789926333">Gamer</option>
			   <option value="866898430141631">Game publisher</option>
			   <option value="201429350256874">Video Game Store</option>
			   <option value="179672275401610">Business Consultant</option>
			   <option value="186230924744328">Clothing store</option>
			   <option value="1086422341396773">Apparel & clothing</option>
			   <option value="128753240528981">Women's clothing store</option>
			   <option value="170241263022353">Men's clothing store</option>
			   <option value="192614304101075">Baby clothing store</option>
			   <option value="2202">Website</option>`;

        todo = todo + "</select></td></tr>";
        todo =
          todo +
          `<tr><td>Style:</td> <td><select style="background: #384959;color:white;" id="Tab4AddFPstyle">
			   <option value="1">NEW</option>
			   <option value="2">Old</option>
			   </select></td></tr>`;

        todo =
          todo +
          '<tr><td>FP Name:</td><td> <input type="text" id="Tab4AddFPname" placeholder="FPname" style="background: #384959;color:white;"  maxlength="50" size="30"></td></tr><tr><td></td><td style="text-align: center; vertical-align: middle;"><button style="background:#384959;color:white;" id="Tab4AddFPForm" onclick="window.AddFPProcessForm(); return false;">Go</button></td></tr></table>';
        addbmNode.innerHTML = "\n<br>" + todo;
      };

      window.AddFPProcessForm = async function () {
        document.getElementById("Tab4AddFPForm").innerText = "Please Wait";
        let apiUrl = "https://www.facebook.com/api/graphql";
        let AddFPName = document.getElementById("Tab4AddFPname").value;
        let AddFPcat = document.getElementById("Tab4AddFPcat").value;
        let AddFPstyle = document.getElementById("Tab4AddFPstyle").value;
        if (AddFPstyle == "1") fbdocid = "4722866874428654";
        else fbdocid = "9339938679410311";
        // AddFPName = AddFPName.replaceAll(' ', '%20;');
        var urlencoded = new URLSearchParams();
        urlencoded.append("jazoest", 25477);
        urlencoded.append("__rev", window.spinR);
        urlencoded.append("__hsi", window.hsi);
        urlencoded.append("__spin_r", window.spinR);
        urlencoded.append("__spin_b", window.spinB);
        urlencoded.append("__spin_t", window.spinT);
        urlencoded.append("fb_api_caller_class", "RelayModern");
        urlencoded.append(
          "fb_api_req_friendly_name",
          "AdditionalProfilePlusCreationMutation",
        );
        urlencoded.append("av", window.socid);
        urlencoded.append("__user", window.socid);
        urlencoded.append("fb_dtsg", window.dtsg);

        if (AddFPstyle == "1")
          urlencoded.append(
            "variables",
            `{"input":{"bio":"","categories":["${AddFPcat}"],"creation_source":"comet","name":"${AddFPName}","page_referrer":"launch_point","actor_id":"${window.socid}","client_mutation_id":"1"}}`,
          );
        else
          urlencoded.append(
            "variables",
            `{"input":{"categories":["${AddFPcat}"],"creation_source":"CM_OFFSITE_CREATE_NEW_PAGE","description":"","name":"${AddFPName}","actor_id":"${window.socid}","client_mutation_id":"1"}}`,
          );
        urlencoded.append("doc_id", fbdocid);
        urlencoded.append("server_timestamps", "true");

        let logNode = document.getElementById("tab4addfplog");
        nolog = 0;
        let response = await fetch(apiUrl, {
          mode: "cors",
          method: "POST",
          credentials: "include",
          redirect: "follow",
          body: urlencoded,
        });
        let json = await response.json();
        console.log(json);
        if (json.errors !== undefined) {
          alert("Error create Page :( ");
          //logNode.innerHTML += "\n<br>" + json.error.error_user_msg;
          document.getElementById("Tab4AddFPForm").innerText = "Another try";
        } else {
          var newfpid = "";
          newfpname = "";
          if (AddFPstyle == "1") {
            try {
              if (
                json.data.additional_profile_plus_create.additional_profile.id >
                0
              ) {
                newfpid =
                  json.data.additional_profile_plus_create.additional_profile
                    .id;
                newfpname = AddFPName;
              }
            } catch (e) {
              newfpid = 0;
              newfpname = "";

              try {
                if (json.data.additional_profile_plus_create.name_error) {
                  alert(json.data.additional_profile_plus_create.name_error);
                  nolog = 1;
                }
              } catch (e) {
                newfpid = 0;
                newfpname = "";
              }
            }
          } else {
            try {
              if (json.data.page_create.page.id > 0) {
                newfpid = json.data.page_create.page.id;
                newfpname = AddFPName;
              }
            } catch (e) {
              newfpid = 0;
              newfpname = "";
            }
            try {
              if (json.data.page_create.page_name_error) {
                alert(json.data.page_create.page_name_error);
                nolog = 1;
              }
            } catch (e) {
              newfpid = 0;
              newfpname = "";
            }
            try {
              if (json.data.page_create.error_message) {
                alert(json.data.page_create.error_message);
                nolog = 1;
              }
            } catch (e) {
              newfpid = 0;
              newfpname = "";
            }
          }
          if (nolog == 0) {
            logNode.innerHTML +=
              "\n<br>" +
              newfpname +
              " [" +
              newfpid +
              "] [<b>&nbsp;</b>][<a href='https://www.facebook.com/" +
              newfpid +
              "' target='_blank'>Open</a>]";
            document.getElementById("Tab4AddFPForm").innerText = "Go New";
          }
        }
      };

      window.PzrdFPList = async function () {
        //	var pzrdid=[];
        //	var banid=[];
        var pzrdret = { pzrdid: [], banid: [] };

        let apiUrl = "https://www.facebook.com/api/graphql";
        var urlencoded = new URLSearchParams();
        urlencoded.append("jazoest", 25477);
        urlencoded.append("__rev", window.spinR);
        urlencoded.append("__hsi", window.hsi);
        urlencoded.append("__spin_r", window.spinR);
        urlencoded.append("__spin_b", window.spinB);
        urlencoded.append("__spin_t", window.spinT);
        urlencoded.append("fb_api_caller_class", "RelayModern");
        urlencoded.append(
          "fb_api_req_friendly_name",
          "AccountQualityUserPagesWrapper_UserPageQuery",
        );
        urlencoded.append("av", window.socid);
        urlencoded.append("__user", window.socid);
        urlencoded.append("fb_dtsg", window.dtsg);
        urlencoded.append("variables", `{"assetOwnerId": ${window.socid}}`);
        urlencoded.append("doc_id", "5196344227155252");
        urlencoded.append("server_timestamps", "true");

        let response = await fetch(apiUrl, {
          mode: "cors",
          method: "POST",
          credentials: "include",
          redirect: "follow",
          body: urlencoded,
        });
        let json = await response.json();
        if (json.errors !== undefined) {
          return pzrdret;
        } else {
          data = json;
          if (
            "data" in data &&
            "userData" in data.data &&
            "pages_can_administer" in data.data.userData
          ) {
            pzrd_count = [];
            for (
              let i = 0;
              i < data.data.userData.pages_can_administer.length;
              i++
            ) {
              var current_page = data.data.userData.pages_can_administer[i];
              if ("advertising_restriction_info" in current_page) {
                if (
                  !current_page.advertising_restriction_info.is_restricted &&
                  current_page.advertising_restriction_info.restriction_type ==
                    "ALE"
                ) {
                  pzrd_count.push(
                    `Pzrd: ${current_page.name} | ${current_page.id}`,
                  );
                  pzrdret.pzrdid.push(current_page.id);
                }
                if (current_page.advertising_restriction_info.is_restricted) {
                  pzrdret.banid.push(current_page.id);
                }
              }
            }
          }
        }
        return pzrdret;
      };

      window.PzrdSocList = async function () {
        //	var pzrdid=[];
        //	var banid=[];
        var pzrdret = { pzrdid: [], banid: [] };

        let apiUrl = "https://www.facebook.com/api/graphql";
        var urlencoded = new URLSearchParams();
        urlencoded.append("jazoest", 25477);
        urlencoded.append("__rev", window.spinR);
        urlencoded.append("__hsi", window.hsi);
        urlencoded.append("__spin_r", window.spinR);
        urlencoded.append("__spin_b", window.spinB);
        urlencoded.append("__spin_t", window.spinT);
        urlencoded.append("fb_api_caller_class", "RelayModern");
        urlencoded.append(
          "fb_api_req_friendly_name",
          "AccountQualityHubAssetOwnerViewV2Query",
        );
        urlencoded.append("av", window.socid);
        urlencoded.append("__user", window.socid);
        urlencoded.append("fb_dtsg", window.dtsg);
        urlencoded.append("variables", `{"assetOwnerId": ${window.socid}}`);
        urlencoded.append("doc_id", "6139497919470985");
        urlencoded.append("server_timestamps", "true");

        let response = await fetch(apiUrl, {
          mode: "cors",
          method: "POST",
          credentials: "include",
          redirect: "follow",
          body: urlencoded,
        });
        let json = await response.json();
        if (json.errors !== undefined) {
          return pzrdret;
        } else {
          data = json;
          if (
            "data" in data &&
            "userData" in data.data &&
            "pages_can_administer" in data.data.userData
          ) {
            pzrd_count = [];
            for (
              let i = 0;
              i < data.data.userData.pages_can_administer.length;
              i++
            ) {
              var current_page = data.data.userData.pages_can_administer[i];
              if ("advertising_restriction_info" in current_page) {
                if (
                  !current_page.advertising_restriction_info.is_restricted &&
                  current_page.advertising_restriction_info.restriction_type ==
                    "ALE"
                ) {
                  pzrd_count.push(
                    `Pzrd: ${current_page.name} | ${current_page.id}`,
                  );
                  pzrdret.pzrdid.push(current_page.id);
                }
                if (current_page.advertising_restriction_info.is_restricted) {
                  pzrdret.banid.push(current_page.id);
                }
              }
            }
          }
        }
        return pzrdret;
      };

      window.PzrdBmList = async function (bmid) {
        let bmNode = document.getElementById("fbaccstatusbmpzrd" + bmid);
        bmNode.innerHTML += "<small>[..]</small>";
        var retbmpzrdstat = "";
        let apiUrl = "https://www.facebook.com/api/graphql";
        var urlencoded = new URLSearchParams();
        urlencoded.append("jazoest", 25477);
        urlencoded.append("__rev", window.spinR);
        urlencoded.append("__hsi", window.hsi);
        urlencoded.append("__spin_r", window.spinR);
        urlencoded.append("__spin_b", window.spinB);
        urlencoded.append("__spin_t", window.spinT);
        urlencoded.append("fb_api_caller_class", "RelayModern");
        urlencoded.append(
          "fb_api_req_friendly_name",
          "AccountQualityHubAssetOwnerViewV2Query",
        );
        urlencoded.append("av", window.socid);
        urlencoded.append("__user", window.socid);
        urlencoded.append("fb_dtsg", window.dtsg);
        urlencoded.append("variables", `{"assetOwnerId": ${bmid}}`);
        urlencoded.append("doc_id", "6139497919470985");
        urlencoded.append("server_timestamps", "true");

        let response = await fetch(apiUrl, {
          mode: "cors",
          method: "POST",
          credentials: "include",
          redirect: "follow",
          body: urlencoded,
        });
        let json = await response.json();
        if (json.errors !== undefined) {
          retbmpzrdstat = "";
        } else {
          console.log(json);
          try {
            if (
              !json.data.assetOwnerData.advertising_restriction_info
                .is_restricted &&
              json.data.assetOwnerData.advertising_restriction_info
                .restriction_type == "ALE"
            ) {
              retbmpzrdstat = '[<span style="color: green;">Reinst</span>]';
            }
          } catch (e) {
            console.log("Error get pzrd BM status");
            retbmpzrdstat = "";
          }
          try {
            if (
              json.data.assetOwnerData.advertising_restriction_info
                .is_restricted &&
              json.data.assetOwnerData.advertising_restriction_info.status ==
                "APPEAL_PENDING"
            ) {
              retbmpzrdstat = '[<span style="color: yellow;">In review</span>]';
            }
          } catch (e) {
            console.log("Error get pzrd BM status");
            retbmpzrdstat = "";
          }
          try {
            if (
              json.data.assetOwnerData.advertising_restriction_info
                .is_restricted &&
              json.data.assetOwnerData.advertising_restriction_info.status ==
                "APPEAL_REJECTED_NO_RETRY"
            ) {
              retbmpzrdstat = '[<span style="color: red;">R.I.P.</span>]';
            }
          } catch (e) {
            console.log("Error get pzrd BM status");
            retbmpzrdstat = "";
          }
        }
        bmNode.innerHTML = retbmpzrdstat;
        return true;
      };


/* =============================================================================
 * SECTION 11: BUSINESS MANAGER — CREATE
 * showAddBM()         — renders Create BM form in tab5
 * AddBMProcessForm()  — submits BM creation
 *   Primary: doc_id 7183377418404152 (BusinessCreationMutation)
 *   Fallback: secondary mutation if primary fails
 *   Pre-fills email as: {shortname}@gmail.com
 * ============================================================================= */

      window.showAddBM = function () {
        document.getElementById("showAddBMbtn").style.display = "none";

        let addbmNode = document.getElementById("tab5showadd");
        let todo = "";
        todo = todo + '<table border="0.1">';

        todo = todo + "";
        todo =
          todo +
          `
			   <tr><td>Type:</td><td> <select style="background: #384959;color:white;" id="Tab5AddBMtype"><option value="1">Сlassic method</option><!--<option value="2">Dev method</option>--></select></td></tr>
			   <tr><td>Name:</td><td> <input type="text" id="Tab5AddBMname" placeholder="BMname" style="background: #384959;color:white;"  maxlength="50" size="30" value="${window.shortname}"></td></tr>
			   <tr><td>email:</td><td> <input type="text" id="Tab5AddBMmail" placeholder="mail" style="background: #384959;color:white;"  maxlength="50" size="30" value="${window.shortname}@gmail.com"></td></tr>`;

        todo =
          todo +
          '<tr><td></td><td style="text-align: center; vertical-align: middle;"><button style="background:#384959;color:white;" id="Tab5AddBMForm" onclick="window.AddBMProcessForm(); return false;">Go</button></td></tr></table>';
        addbmNode.innerHTML = "\n<br>" + todo;
      };

      window.AddBMProcessForm = async function () {
        document.getElementById("Tab5AddBMForm").innerText = "Please Wait";

        let AddBMName = document.getElementById("Tab5AddBMname").value;
        let AddBMmail = document.getElementById("Tab5AddBMmail").value;
        let AddBMtype = document.getElementById("Tab5AddBMtype").value;
        if (AddBMtype == 1) {
          let apiUrl = "https://www.facebook.com/api/graphql/";

          var urlencoded = new URLSearchParams();

          urlencoded.append("__rev", window.spinR);
          urlencoded.append("__hsi", window.hsi);
          urlencoded.append("__spin_r", window.spinR);
          urlencoded.append("__spin_b", window.spinB);
          urlencoded.append("__spin_t", window.spinT);
          urlencoded.append("fb_api_caller_class", "RelayModern");
          urlencoded.append(
            "fb_api_req_friendly_name",
            "useBusinessCreationMutationMutation",
          );
          urlencoded.append("av", window.socid);
          urlencoded.append("__user", window.socid);
          urlencoded.append("fb_dtsg", window.dtsg);
          urlencoded.append(
            "variables",
            `{"input":{"client_mutation_id":"1","actor_id":"${window.socid}","business_name":"${AddBMName}","user_first_name":"${window.shortname}","user_last_name":"${window.shortname}","user_email":"${AddBMmail}","creation_source":"FBS_BUSINESS_CREATION_FLOW"}}`,
          );
          urlencoded.append("doc_id", "7183377418404152");
          urlencoded.append("server_timestamps", "true");

          let logNode = document.getElementById("tab5addbmlog");
          let response = await fetch(apiUrl, {
            mode: "cors",
            method: "POST",
            credentials: "include",
            redirect: "follow",
            body: urlencoded,
          });
          let json = await response.json();
          //console.log(json);
          if (json.errors !== undefined) {
            alert("Error creating new BM :(");
            //logNode.innerHTML += "\n<br>" + json.error.error_user_msg;
            document.getElementById("Tab5AddBMForm").innerText = "Another try";
          } else {
            if (json.data.bizkit_create_business.id > 0)
              logNode.innerHTML +=
                "\n<br>" +
                AddBMName +
                " (" +
                json.data.bizkit_create_business.id +
                ")";

            document.getElementById("Tab5AddBMForm").innerText = "Go Go Go";
          }
        } else {
          var urlencoded = new URLSearchParams();

          urlencoded.append("first_name", window.fullname);
          urlencoded.append("last_name", window.shortname);
          urlencoded.append("brand_name", AddBMName);
          urlencoded.append("email", AddBMmail);
          urlencoded.append("timezone_id", "0");
          urlencoded.append("business_category", "OTHER");

          urlencoded.append("__rev", window.spinR);
          urlencoded.append("__hsi", window.hsi);
          urlencoded.append("__spin_r", window.spinR);
          urlencoded.append("__spin_b", window.spinB);
          urlencoded.append("__spin_t", window.spinT);
          // urlencoded.append("fb_api_caller_class", "RelayModern");
          //urlencoded.append("fb_api_req_friendly_name", "useBusinessCreationMutationMutation");
          urlencoded.append("av", window.socid);
          urlencoded.append("__user", window.socid);
          urlencoded.append("fb_dtsg", window.dtsg);
          let apiUrl =
            "https://developers.facebook.com/business/create/?brand_name=" +
            AddBMName +
            "&first_name=" +
            window.fullname +
            "&last_name=" +
            window.shortname +
            "&email=" +
            AddBMmail +
            "&timezone_id=0&business_category=OTHER";
          //urlencoded.append("variables", `{"input":{"client_mutation_id":"1","actor_id":"${window.socid}","business_name":"${AddBMName}","user_first_name":"${window.shortname}","user_last_name":"${window.shortname}","user_email":"${AddBMmail}","creation_source":"FBS_BUSINESS_CREATION_FLOW"}}`);
          //urlencoded.append("doc_id", '7183377418404152');

          let logNode = document.getElementById("tab5addbmlog");
          let response = await fetch(apiUrl, {
            mode: "no-cors",
            method: "POST",
            credentials: "include",
            redirect: "follow",
            body: urlencoded,
            referrerPolicy: "same-origin",
          });
          let json = await response.json();
          //console.log(json);
          if (json.errors !== undefined) {
            alert("Error creating new BM :(");
            //logNode.innerHTML += "\n<br>" + json.error.error_user_msg;
            document.getElementById("Tab5AddBMForm").innerText = "Another try";
          } else {
            if (json.data.bizkit_create_business.id > 0)
              logNode.innerHTML +=
                "\n<br>" +
                AddBMName +
                " (" +
                json.data.bizkit_create_business.id +
                ")";

            document.getElementById("Tab5AddBMForm").innerText = "Go Go Go";
          }
        }
      };


/* =============================================================================
 * SECTION 12: CREDIT CARD ENUMERATION
 * getcc() — aggregates all payment methods:
 *   1. BM cards: graph v19.0/me/businesses?fields=...creditcards
 *   2. Account cards: graph v19.0/me/adaccounts?fields=...funding_source_details
 *   Returns array [{cctype:"bmcc"|"usercc", ccinf: name, ...card_fields}]
 * ============================================================================= */

      window.getcc = async function () {
        var credcca = [];
        var cctype = "bmcc";
        tmpapiurl =
          "https://graph.facebook.com/v19.0/me/businesses?fields=id,is_disabled_for_integrity_reasons,can_use_extended_credit,name,verification_status,creditcards&access_token=" +
          window.privateToken;
        let response = await fetch(tmpapiurl, {
          mode: "cors",
          method: "GET",
          credentials: "include",
          redirect: "follow",
        });
        let bminf = await response.json();
        if (bminf.errors !== undefined) {
        } else {
          if (bminf.data.length) {
            var i = 0;
            for (; i < bminf.data.length; i++) {
              try {
                if (bminf.data[i].creditcards.data.length) {
                  for (
                    var icc = 0;
                    icc < bminf.data[i].creditcards.data.length;
                    icc++
                  ) {
                    bminf.data[i].creditcards.data[icc].cctype = "bmcc";
                    bminf.data[i].creditcards.data[icc].ccinf =
                      bminf.data[i].name;
                    credcca.push(bminf.data[i].creditcards.data[icc]);
                    // console.log(credcca);
                  }
                }
              } catch (e) {
                console.log("No bm cred cc");
              }
            }
          }
        }

        tmpapiurl2 =
          "https://graph.facebook.com/v19.0/me/adaccounts?fields=id,account_id,business,name,funding_source_details&limit=1000&sort=name_ascending&access_token=" +
          window.privateToken;
        let response2 = await fetch(tmpapiurl2, {
          mode: "cors",
          method: "GET",
          credentials: "include",
          redirect: "follow",
        });
        let bminf2 = await response2.json();
        if (bminf2.errors !== undefined) {
        } else {
          if (bminf2.data.length) {
            var i = 0;
            for (; i < bminf2.data.length; i++) {
              try {
                if (bminf2.data[i].funding_source_details) {
                  bminf2.data[i].funding_source_details.cctype = "usercc";
                  bminf2.data[i].funding_source_details.ccinf =
                    bminf2.data[i].name;
                  credcca.push(bminf2.data[i].funding_source_details);
                }
              } catch (e) {
                console.log("No cred cc");
              }
            }
          }
        }
        return credcca;
      };


/* =============================================================================
 * SECTION 13: PAGE COMMENTS
 * getFpComments()  — fetch all comments from user Pages via graph v19.0
 * delFpComments()  — bulk delete fetched comments
 * ============================================================================= */

      window.getFpComments = async function () {
        //var retrn='';var todo='';var i=0;var ic=0;var tmpadimages=[];tmpadcreatives=[];
        var currfp;
        var currfpcnt = 0;

        tmpapiurl =
          "https://graph.facebook.com/v19.0/me?fields=accounts.limit(100){id,name,ads_posts.limit(100){id,comments.limit(100){id}}}&access_token=" +
          window.privateToken;
        let response = await fetch(tmpapiurl, {
          mode: "cors",
          method: "GET",
          credentials: "include",
          redirect: "follow",
        });
        let bminf = await response.json();
        if (bminf.errors !== undefined) {
        } else {
          if (bminf.accounts.data.length) {
            var i = 0;
            var icc = 0;
            for (; i < bminf.accounts.data.length; i++) {
              currfp = document.getElementById(
                "fpcomm_" + bminf.accounts.data[i].id,
              );
              //	console.log("fpcomm_"+bminf.accounts.data[i].id);
              //	console.log(currfp);
              //currfpcnt=currfp.innerHTML;
              //if(currfpcnt=='-')
              currfpcnt = 0;
              currfp.innerHTML = "...";
              try {
                if (bminf.accounts.data[i].ads_posts.data.length) {
                  for (
                    icc = 0;
                    icc < bminf.accounts.data[i].ads_posts.data.length;
                    icc++
                  ) {
                    try {
                      if (
                        bminf.accounts.data[i].ads_posts.data[icc].comments.data
                          .length
                      ) {
                        //	  console.log('Adpost:'+bminf.accounts.data[i].ads_posts.data[icc].id+' '+bminf.accounts.data[i].ads_posts.data[icc].comments.data.length+' comments found');
                        currfpcnt =
                          currfpcnt +
                          bminf.accounts.data[i].ads_posts.data[icc].comments
                            .data.length;
                      }
                    } catch (e) {
                      console.log("Adpost without comments");
                    }
                  }
                }
              } catch (e) {
                console.log("No adpost with comments");
              }
              currfp.innerHTML = currfpcnt;

              if (currfpcnt > 0)
                document.getElementById("fpcleanall").innerHTML =
                  '<b><a onclick=\'window.delFpComments();\'><svg width="14" height="14" clip-rule="evenodd" fill-rule="evenodd" stroke-linejoin="round" stroke-miterlimit="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="m4.015 5.494h-.253c-.413 0-.747-.335-.747-.747s.334-.747.747-.747h5.253v-1c0-.535.474-1 1-1h4c.526 0 1 .465 1 1v1h5.254c.412 0 .746.335.746.747s-.334.747-.746.747h-.254v15.435c0 .591-.448 1.071-1 1.071-2.873 0-11.127 0-14 0-.552 0-1-.48-1-1.071zm14.5 0h-13v19.006h13zm-4.25 2.506c-.414 0-.75.336-.75.75v8.5c0 .414.336.75.75.75s.75-.336.75-.75v-8.5c0-.414-.336-.75-.75-.75zm-4.5 0c-.414 0-.75.336-.75.75v8.5c0 .414.336.75.75.75s.75-.336.75-.75v-8.5c0-.414-.336-.75-.75-.75zm3.75-4v-.5h-3v.5z" fill="#79abd6"/></svg></a></b>';
              await sleep(2000);
            }
          }
        }

        function sleep(ms) {
          return new Promise((resolve) => setTimeout(resolve, ms));
        }
      };

      window.delFpComments = async function () {
        //var retrn='';var todo='';var i=0;var ic=0;var tmpadimages=[];tmpadcreatives=[];
        document.getElementById("showAddFPbtn").style.display = "none";
        var currfp;
        var currfpcnt = 0;
        var currpageToken;

        tmpapiurl =
          "https://graph.facebook.com/v19.0/me?fields=accounts.limit(100){id,name,ads_posts.limit(100){id,comments.limit(100){id}}}&access_token=" +
          window.privateToken;
        let response = await fetch(tmpapiurl, {
          mode: "cors",
          method: "GET",
          credentials: "include",
          redirect: "follow",
        });
        let bminf = await response.json();
        if (bminf.errors !== undefined) {
        } else {
          if (bminf.accounts.data.length) {
            var i = 0;
            var icc = 0;
            var icom = 0;
            for (; i < bminf.accounts.data.length; i++) {
              currfp = document.getElementById(
                "fpcomm_" + bminf.accounts.data[i].id,
              );
              currpageToken = await window.getPageToken(
                bminf.accounts.data[i].id,
              );
              console.log(
                "Page: " +
                  bminf.accounts.data[i].id +
                  " Token: " +
                  currpageToken,
              );
              // console.log("fpcomm_"+bminf.accounts.data[i].id);
              // console.log(currfp);
              //currfpcnt=currfp.innerHTML;
              //if(currfpcnt=='-')
              currfpcnt = 0;
              currfp.innerHTML = "...";
              try {
                if (bminf.accounts.data[i].ads_posts.data.length) {
                  for (
                    icc = 0;
                    icc < bminf.accounts.data[i].ads_posts.data.length;
                    icc++
                  ) {
                    try {
                      if (
                        bminf.accounts.data[i].ads_posts.data[icc].comments.data
                          .length
                      ) {
                        console.log(
                          "Adpost:" +
                            bminf.accounts.data[i].ads_posts.data[icc].id +
                            " " +
                            bminf.accounts.data[i].ads_posts.data[icc].comments
                              .data.length +
                            " comments found",
                        );
                        currfpcnt =
                          currfpcnt +
                          bminf.accounts.data[i].ads_posts.data[icc].comments
                            .data.length;
                        for (
                          icom = 0;
                          icom <
                          bminf.accounts.data[i].ads_posts.data[icc].comments
                            .data.length;
                          icom++
                        ) {
                          ////dell

                          tmpapiurldel =
                            "https://graph.facebook.com/v19.0/" +
                            bminf.accounts.data[i].ads_posts.data[icc].comments
                              .data[icom].id +
                            "?access_token=" +
                            currpageToken;
                          dresponse = await fetch(tmpapiurldel, {
                            mode: "cors",
                            method: "DELETE",
                            credentials: "include",
                            redirect: "follow",
                          });
                          dinf = await dresponse.json();
                          if (dinf.success == true) {
                            document.getElementById("tab4addfplog").innerHTML +=
                              "Page: " +
                              bminf.accounts.data[i].id +
                              " Comment <b>" +
                              (icom + 1) +
                              "</b> from " +
                              bminf.accounts.data[i].ads_posts.data[icc]
                                .comments.data.length +
                              " deleted<br>";
                          }
                          //

                          //  console.log(dinf);
                          //  console.log(bminf.accounts.data[i].ads_posts.data[icc].comments.data[icom].id);
                          await sleep(1000);
                        }
                      }
                    } catch (e) {
                      console.log("Adpost without comments");
                    }
                  }
                }
              } catch (e) {
                console.log("No adpost with comments");
              }
              currfp.innerHTML = currfpcnt;

              if (currfpcnt > 0)
                document.getElementById("fpcleanall").innerHTML =
                  '<b><a onclick=\'window.delFpComments();\'><svg width="14" height="14" clip-rule="evenodd" fill-rule="evenodd" stroke-linejoin="round" stroke-miterlimit="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="m4.015 5.494h-.253c-.413 0-.747-.335-.747-.747s.334-.747.747-.747h5.253v-1c0-.535.474-1 1-1h4c.526 0 1 .465 1 1v1h5.254c.412 0 .746.335.746.747s-.334.747-.746.747h-.254v15.435c0 .591-.448 1.071-1 1.071-2.873 0-11.127 0-14 0-.552 0-1-.48-1-1.071zm14.5 0h-13v19.006h13zm-4.25 2.506c-.414 0-.75.336-.75.75v8.5c0 .414.336.75.75.75s.75-.336.75-.75v-8.5c0-.414-.336-.75-.75-.75zm-4.5 0c-.414 0-.75.336-.75.75v8.5c0 .414.336.75.75.75s.75-.336.75-.75v-8.5c0-.414-.336-.75-.75-.75zm3.75-4v-.5h-3v.5z" fill="#79abd6"/></svg></a></b>';

              await sleep(2000);
            }
          }
        }

        function sleep(ms) {
          return new Promise((resolve) => setTimeout(resolve, ms));
        }
      };


/* =============================================================================
 * SECTION 14: ADS INSPECTION
 * getAccAds(accid) — fetch ads list via graph v19.0/act_{id}/ads
 *   fields: name, status, ad_review_feedback, adcreatives{image_url},
 *           delivery_status
 *   Returns HTML table string for injection into tab1
 *   Shows Appeal button if ad_review_feedback is present
 * ============================================================================= */

      window.getAccAds = async function (accid) {
        var retrn = "";
        var todo = "";
        var i = 0;
        var ic = 0;
        var tmpadimages = [];
        tmpadcreatives = [];
        ///?fields=adimages.limit(100){name,url_128,ads_integrity_review_info,creatives},advideos.limit(100){id,picture,ads_integrity_review_info},ads.limit(100){name,status,ad_review_feedback,adcreatives{id,image_url},delivery_status},adcreatives.limit(100){id,name,object_id,object_story_spec}
        ///var ApiUrlMainInfo = "https://graph.facebook.com/v19.0/act_" + accid + "/ads/?fields=name,status,ad_review_feedback,adcreatives{image_url},delivery_status&limit=100&access_token=" + window.privateToken + "&locale=en_US";
        var ApiUrlMainInfo =
          "https://graph.facebook.com/v19.0/act_" +
          accid +
          "/?fields=adimages.limit(100){name,url_128,ads_integrity_review_info,creatives},advideos.limit(100){id,picture,ads_integrity_review_info},ads.limit(100){name,status,ad_review_feedback,adcreatives{id,image_url},delivery_status},adcreatives.limit(100){id,name,object_id,object_story_spec,thumbnail_url}&limit=100&access_token=" +
          window.privateToken +
          "&locale=en_US";
        let response = await fetch(ApiUrlMainInfo, {
          mode: "cors",
          method: "GET",
          credentials: "include",
          redirect: "follow",
        });
        let AccAds = await response.json();
        console.log(AccAds);
        if (AccAds.errors !== undefined) {
        } else {
          if (AccAds.ads.data.length) {
            try {
              if (AccAds.adimages.data.length) {
                for (i = 0; i < AccAds.adimages.data.length; i++) {
                  //console.log(AccAds.adimages.data[i]);
                  ///try{tmpadimages[AccAds.adimages.data[i].creatives[0]]=AccAds.adimages.data[i];}catch (e) {console.log("Adimage not use");}
                  try {
                    if (AccAds.adimages.data[i].creatives.length) {
                      for (
                        ic = 0;
                        ic < AccAds.adimages.data[i].creatives.length;
                        ic++
                      ) {
                        tmpadimages[AccAds.adimages.data[i].creatives[ic]] =
                          AccAds.adimages.data[i];
                      }
                    }
                  } catch (e) {
                    console.log("Adimage not use");
                  }

                  /*if(AccAds.adimages.data[i].creatives[0]){
							tmpadimages[AccAds.adimages.data[i].creatives[0]]=AccAds.adimages.data[i];
						}else{
							console.log('Adimage not use');
						}*/
                }
              }
            } catch (e) {
              console.log("No adimages array");
            }
            try {
              if (AccAds.adcreatives.data.length) {
                for (i = 0; i < AccAds.adcreatives.data.length; i++) {
                  //console.log(AccAds.adimages.data[i]);
                  try {
                    tmpadcreatives[AccAds.adcreatives.data[i].id] =
                      AccAds.adcreatives.data[i];
                  } catch (e) {
                    console.log("Adcreatives not use");
                  }
                }
              }
            } catch (e) {
              console.log("No adcreatives array");
            }

            //console.log(tmpadimages);
            //console.log(tmpadcreatives);
            var b = AccAds.ads;
            todo =
              todo +
              '<table border="0.1"><tr style="font-size: 12px;text-decoration: none;color: #7FB5DA;"><th>#</th><th>Name</th><th>Status</th><th class="getAccAdsfullcl" style="display:none">Bot review</th><th class="getAccAdsfullcl" style="display:none">Human review</th><th class="getAccAdsfullcl" style="display:none">Preapproval</th><th class="getAccAdsfullcl" style="display:none">Review needed</th><th class="getAccAdsfullcl" style="display:none">Review Start TS</th><th class="getAccAdsfullcl" style="display:none">Review Update TS</th><th></th><th id="getAccAdsfull" class="getAccAdsfullcInactive"><a onclick="window.showMorePopupAccAdsFull()"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-toggle-off" viewBox="0 0 16 16"> <path d="M11 4a4 4 0 0 1 0 8H8a4.992 4.992 0 0 0 2-4 4.992 4.992 0 0 0-2-4h3zm-6 8a4 4 0 1 1 0-8 4 4 0 0 1 0 8zM0 8a5 5 0 0 0 5 5h6a5 5 0 0 0 0-10H5a5 5 0 0 0-5 5z" fill="#7FB5DA"/> </svg></a></th></tr>';
            i = 0;
            for (; i < b.data.length; i++) {
              if (b.data[i].name) {
                todo = todo + "<tr>";

                if (b.data[i].delivery_status.status) {
                  switch (b.data[i].delivery_status.status) {
                    case "active":
                      delivstatus = "<b>&#128994;</b>ACTIVE";
                      break;
                    case "inactive":
                      delivstatus = "<b>&#x23F8;</b>";
                      break;
                    case "off":
                      delivstatus = "<b>&#x23F8;</b>";
                      break;
                    case "error":
                      delivstatus = "&#128997;Error";
                      break;
                    case "xz":
                      delivstatus = "xz";
                      break;

                    default:
                      delivstatus = " " + b.data[i].delivery_status.status;
                      break;
                  }
                }

                if (b.data[i].adcreatives.data[0].image_url) {
                  tblcreo =
                    '<img width=30 height=30 src="' +
                    b.data[i].adcreatives.data[0].image_url +
                    '" onclick="window.copytocb(`' +
                    b.data[i].id +
                    '`);"/>';
                } else {
                  try {
                    if (
                      tmpadcreatives[b.data[i].adcreatives.data[0].id]
                        .thumbnail_url
                    )
                      tblcreo =
                        '<img width=30 height=30 src="' +
                        tmpadcreatives[b.data[i].adcreatives.data[0].id]
                          .thumbnail_url +
                        '"/>';
                  } catch (e) {
                    console.log("Video without adimage");
                    tblcreo = "";
                  }
                }

                /* console.log('CRID:'+b.data[i].adcreatives.data[0].id);
		 console.log('tmpadcreatives:');
		 console.log(tmpadcreatives[b.data[i].adcreatives.data[0].id]);
		 console.log('tmpadimages:');
		  console.log(tmpadimages[b.data[i].adcreatives.data[0].id]);
		 */
                let revstatus = "";
                let hrevstatus = "";
                let preapstatus = "";
                let preapnd = "";
                let revstartts = "";
                let revupts = "";
                try {
                  switch (
                    tmpadimages[b.data[i].adcreatives.data[0].id]
                      .ads_integrity_review_info.is_reviewed
                  ) {
                    case true:
                      revstatus = '<b style="color:green;">&#10003;</b>';
                      break;
                    case false:
                      revstatus = "n/a";
                      break;
                    default:
                      revstatus = " ";
                      break;
                  }
                } catch (e) {
                  console.log("revstatus error");
                  revstatus = "";
                }
                try {
                  switch (
                    tmpadimages[b.data[i].adcreatives.data[0].id]
                      .ads_integrity_review_info.is_human_reviewed
                  ) {
                    case true:
                      hrevstatus = '<b style="color:green;">&#10003;</b>';
                      break;
                    case false:
                      hrevstatus = "n/a";
                      break;

                    default:
                      hrevstatus = " ";
                      break;
                  }
                } catch (e) {
                  console.log("hrevstatus error");
                  hrevstatus = "";
                }

                try {
                  if (
                    tmpadimages[b.data[i].adcreatives.data[0].id]
                      .ads_integrity_review_info.component_review_status_info
                  ) {
                    preapstatus =
                      tmpadimages[b.data[i].adcreatives.data[0].id]
                        .ads_integrity_review_info.component_review_status_info
                        .preapproval_review_status;
                    preapnd =
                      tmpadimages[b.data[i].adcreatives.data[0].id]
                        .ads_integrity_review_info.component_review_status_info
                        .preapproval_human_review_needed;

                    revstartts =
                      tmpadimages[b.data[i].adcreatives.data[0].id]
                        .ads_integrity_review_info.component_review_status_info
                        .preapproval_review_start_ts;
                    revstartts = revstartts.replace("+0000", "");
                    revstartts = revstartts.replace("T", "<br> ");
                    revupts =
                      tmpadimages[b.data[i].adcreatives.data[0].id]
                        .ads_integrity_review_info.component_review_status_info
                        .preapproval_review_update_ts;
                    revupts = revupts.replace("+0000", "");
                    revupts = revupts.replace("T", "<br> ");
                  }
                } catch (e) {
                  console.log("preap status error");
                  preapstatus = "";
                  preapnd = "";
                  revupts = "";
                  revstartts = "";
                }

                if (b.data[i].ad_review_feedback) {
                  todo =
                    todo +
                    ("<td><b>" +
                      tblcreo +
                      "</b></td><td><b onclick='window.copytocb(`" +
                      b.data[i].id +
                      "`);'>" +
                      b.data[i].name +
                      "</b></td><td>[" +
                      delivstatus +
                      '] <!--[<a onclick="window.appealadcreo(`' +
                      b.data[i].id +
                      '`);" href="#">Appeal</a>]--><button style="background:#384959;color:white;" id="MainAppeal' +
                      b.data[i].id +
                      '" onclick="window.appealadcreo(`' +
                      b.data[i].id +
                      '`); return false;">Appeal</button>' +
                      "</td>");
                } else {
                  todo =
                    todo +
                    ("<td><b>" +
                      tblcreo +
                      "</b></td><td><b onclick='window.copytocb(`" +
                      b.data[i].id +
                      "`);'>" +
                      b.data[i].name +
                      "</b></td> <td>[" +
                      delivstatus +
                      "] " +
                      "</td>");
                }

                todo =
                  todo +
                  "<td class='getAccAdsfullcl' style='display:none'><center>" +
                  revstatus +
                  "</center></td><td class='getAccAdsfullcl' style='display:none'><center>" +
                  hrevstatus +
                  "</center></td><td class='getAccAdsfullcl' style='display:none'><center>" +
                  preapstatus +
                  "</center></td><td class='getAccAdsfullcl' style='display:none'><center>" +
                  preapnd +
                  "</center></td><td class='getAccAdsfullcl' style='display:none'><center>" +
                  revstartts +
                  "</center></td><td class='getAccAdsfullcl' style='display:none'><center>" +
                  revupts +
                  "</center></td>";

                if (b.data[i].ad_review_feedback) {
                  if (b.data[i].ad_review_feedback.global) {
                    todo = todo + "<td>";
                    var rjkey;
                    for (var k in b.data[i].ad_review_feedback.global) {
                      rjkey =
                        k +
                        "[<a onclick='alert(\"" +
                        b.data[i].ad_review_feedback.global[k] +
                        "\");'> ? </a>]";
                      todo = todo + rjkey;
                    }
                    todo = todo + "</td>";
                  } else {
                    todo = todo + "<td></td>";
                  }
                } else {
                  todo = todo + "<td></td>";
                }
                todo = todo + "<td></td></tr>";
              }
            }
            todo = todo + "</table>";
          }
          //window.showPluginPopup(event, todo,'Account Ads');
        }
        return todo;
      };


/* =============================================================================
 * SECTION 15: PAGE (FP) POPUP ACTIONS
 * showMorePopupFpOwnedBmRm(bmid, fpid) — remove Page from BM
 *   GraphQL doc_id: 5196344227155252
 * showMorePopupFpRoles(fpid)            — list/manage Page admin roles
 * showMorePopupFpAdsRm(fpid, adsid)     — remove ad from Page
 * showMorePopupFpAds(fpid)              — list ads for a Page
 * ============================================================================= */

      window.showMorePopupFpOwnedBmRm = async function (bmid, fpid) {
        if (
          confirm(
            "Are you sure you want to remove page " +
              fpid +
              " from BM " +
              bmid +
              " ?",
          )
        ) {
          let apiUrl = "https://graph.facebook.com/v19.0/";
          let params;
          params = `${bmid}/pages?access_token=${window.privateToken}`;
          var urlencoded = new URLSearchParams();
          urlencoded.append("method", "delete");
          urlencoded.append("page_id", fpid);
          urlencoded.append("access_token", window.privateToken);

          let logNode = document.getElementById("showMorePopupFpRoleslog");
          let response = await fetch(apiUrl + params, {
            mode: "cors",
            method: "POST",
            credentials: "include",
            redirect: "follow",
            body: urlencoded,
          });
          let json = await response.json();
          if (json.error !== undefined) {
            alert(json.error.message);
            logNode.innerHTML += "\n<br>" + json.error.message;
            ///break;
          } else {
            logNode.innerHTML += "\n<br>Done!";
          }
          await sleep(2000);
          window.showMorePopupFpRoles(fpid);
          //}
          function sleep(ms) {
            return new Promise((resolve) => setTimeout(resolve, ms));
          }
        }
      };

      window.showMorePopupFpRoles = async function (fpid) {
        //var todo= await window.getAccAds(accid);
        //window.showPluginPopup(event, todo,'Account Ads');
        tmpapiurl =
          "https://graph.facebook.com/v19.0/" +
          fpid +
          "?fields=roles,business,agencies&limit=100&access_token=" +
          window.privateToken;
        var todoret = "";
        var BMUrole;
        window.getJSON(
          tmpapiurl,
          await function (err, bminf) {
            if (err !== null) {
              alert("Something went wrong: " + err);
            } else {
              if (bminf.roles.data.length) {
                // console.log(bminf);
                todoret =
                  todoret +
                  '<table border="0.1"><tr style="font-size: 12px;text-decoration: none;color: #7FB5DA;"><th>Name</th><th>Role</th><th>#</th></tr>';
                var i = 0;
                for (; i < bminf.roles.data.length; i++) {
                  try {
                    if (bminf.roles.data[i].name) {
                      ///BMUname=`<a href='https://fb.com/${bminf.data[i].id}' target="_blank">`+bminf.data[i].name+'</a>';
                      BMUname = bminf.roles.data[i].name;
                      BMUname +=
                        "&nbsp;<a href='https://www.facebook.com/" +
                        bminf.roles.data[i].id +
                        '\' target=\'_blank\'><svg width="10" height="10" xmlns="http://www.w3.org/2000/svg" fill-rule="evenodd" viewBox="0 0 24 24" clip-rule="evenodd"><path d="M14 4h-13v18h20v-11h1v12h-22v-20h14v1zm10 5h-1v-6.293l-11.646 11.647-.708-.708 11.647-11.646h-6.293v-1h8v8z" fill="#79abd6"/></svg></a>';
                    }
                  } catch (e) {
                    BMUname = "NA";
                  }

                  try {
                    if (bminf.roles.data[i].tasks) {
                      if (bminf.roles.data[i].tasks.indexOf("MANAGE") != -1) {
                        BMUrole = "MANAGE";
                      } else if (
                        bminf.roles.data[i].tasks.indexOf("ADVERTISE") != -1
                      ) {
                        BMUrole = "ADVERTISE";
                      } else if (
                        bminf.roles.data[i].tasks.indexOf("ANALYZE") != -1
                      ) {
                        BMUrole = "ANALYZE";
                      }
                    }
                  } catch (e) {
                    BMUrole = "NA";
                    console.log("NA FP Role");
                  }

                  todoret =
                    todoret +
                    ("<tr><td><b>" +
                      BMUname +
                      "</b></td> <td><center><b>" +
                      BMUrole +
                      "</b></center> " +
                      "</td><td></td></tr>");
                }

                try {
                  try {
                    if (bminf.business.name) {
                      BMUname = bminf.business.name;
                    }
                  } catch (e) {
                    BMUname = "NA";
                  }

                  todoret =
                    todoret +
                    ("<tr><td>" +
                      '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"><path d="M0 7v15h24v-15h-24zm22 13h-20v-6h6v-2h-6v-3h20v3h-6v2h6v6zm-13-15.5c0-.276.224-.5.5-.5h5c.276 0 .5.224.5.5v1.5h2v-2c0-1.104-.896-2-2-2h-6c-1.104 0-2 .896-2 2v2h2v-1.5zm5 6.5h-4v4h4v-4z" fill="#79abd6"/></svg>&nbsp;' +
                      "" +
                      BMUname +
                      "</td> <td><center><b>BM Owner</b></center> " +
                      "</td><td><b><a onclick='window.showMorePopupFpOwnedBmRm(`" +
                      bminf.business.id +
                      "`,`" +
                      fpid +
                      "`);'>" +
                      '<svg clip-rule="evenodd" fill-rule="evenodd" stroke-linejoin="round" stroke-miterlimit="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="m12.002 2.005c5.518 0 9.998 4.48 9.998 9.997 0 5.518-4.48 9.998-9.998 9.998-5.517 0-9.997-4.48-9.997-9.998 0-5.517 4.48-9.997 9.997-9.997zm0 1.5c-4.69 0-8.497 3.807-8.497 8.497s3.807 8.498 8.497 8.498 8.498-3.808 8.498-8.498-3.808-8.497-8.498-8.497zm0 7.425 2.717-2.718c.146-.146.339-.219.531-.219.404 0 .75.325.75.75 0 .193-.073.384-.219.531l-2.717 2.717 2.727 2.728c.147.147.22.339.22.531 0 .427-.349.75-.75.75-.192 0-.384-.073-.53-.219l-2.729-2.728-2.728 2.728c-.146.146-.338.219-.53.219-.401 0-.751-.323-.751-.75 0-.192.073-.384.22-.531l2.728-2.728-2.722-2.722c-.146-.147-.219-.338-.219-.531 0-.425.346-.749.75-.749.192 0 .385.073.531.219z" fill-rule="nonzero" fill="#79abd6"/></svg>' +
                      "</a></b></td></tr>");
                  // }
                } catch (e) {
                  console.log("FP not owned ..");
                }

                try {
                  var i = 0;
                  for (; i < bminf.agencies.data.length; i++) {
                    try {
                      if (bminf.agencies.data[i].name) {
                        ///BMUname=`<a href='https://fb.com/${bminf.data[i].id}' target="_blank">`+bminf.data[i].name+'</a>';
                        BMUname = bminf.agencies.data[i].name;
                      }
                    } catch (e) {
                      BMUname = "NA";
                    }
                    /* try { if (bminf.pending_users.data[i].role){
				  BMUrole=bminf.pending_users.data[i].role;
			  }
			  }catch (e) {BMUrole='NA';}*/
                    todoret =
                      todoret +
                      ("<tr><td>" +
                        '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"><path d="M0 7v15h24v-15h-24zm22 13h-20v-6h6v-2h-6v-3h20v3h-6v2h6v6zm-13-15.5c0-.276.224-.5.5-.5h5c.276 0 .5.224.5.5v1.5h2v-2c0-1.104-.896-2-2-2h-6c-1.104 0-2 .896-2 2v2h2v-1.5zm5 6.5h-4v4h4v-4z" fill="#79abd6"/></svg>&nbsp;' +
                        "" +
                        BMUname +
                        "</td> <td><center><b>Shared BM</b></center> " +
                        "</td><td><b><a onclick='window.showMorePopupFpOwnedBmRm(`" +
                        bminf.agencies.data[i].id +
                        "`,`" +
                        fpid +
                        "`);'>" +
                        '<svg clip-rule="evenodd" fill-rule="evenodd" stroke-linejoin="round" stroke-miterlimit="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="m12.002 2.005c5.518 0 9.998 4.48 9.998 9.997 0 5.518-4.48 9.998-9.998 9.998-5.517 0-9.997-4.48-9.997-9.998 0-5.517 4.48-9.997 9.997-9.997zm0 1.5c-4.69 0-8.497 3.807-8.497 8.497s3.807 8.498 8.497 8.498 8.498-3.808 8.498-8.498-3.808-8.497-8.498-8.497zm0 7.425 2.717-2.718c.146-.146.339-.219.531-.219.404 0 .75.325.75.75 0 .193-.073.384-.219.531l-2.717 2.717 2.727 2.728c.147.147.22.339.22.531 0 .427-.349.75-.75.75-.192 0-.384-.073-.53-.219l-2.729-2.728-2.728 2.728c-.146.146-.338.219-.53.219-.401 0-.751-.323-.751-.75 0-.192.073-.384.22-.531l2.728-2.728-2.722-2.722c-.146-.147-.219-.338-.219-.531 0-.425.346-.749.75-.749.192 0 .385.073.531.219z" fill-rule="nonzero" fill="#79abd6"/></svg>' +
                        "</a></b></td></tr>");
                  }
                } catch (e) {
                  console.log("0 AG BM ..");
                }

                todoret = todoret + "</table>";
              } else {
                toret = "Error";
              }
            }
            todoret =
              todoret +
              "\n<hr width='90%'><!--<center><button id='showMorePopupBMUsersAddbtn' style='background:#384959;color:white;' onclick='window.showMorePopupBMUsersAdd(`" +
              fpid +
              "`); return true;'>Invite User</button></center><div id='showMorePopupBMUsersAddform'></div>--><div id='showMorePopupFpRoleslog'></div>";
            window.showPluginPopup(event, todoret, "Page Roles");
          },
        );
      };

      window.showMorePopupFpAdsRm = async function (fpid, adsid) {
        var currpageToken = await window.getPageToken(fpid);

        tmpapiurldel =
          "https://graph.facebook.com/v19.0/" +
          adsid +
          "?access_token=" +
          currpageToken;
        dresponse = await fetch(tmpapiurldel, {
          mode: "cors",
          method: "DELETE",
          credentials: "include",
          redirect: "follow",
        });
        dinf = await dresponse.json();
        if (dinf.success == true) {
          document.getElementById("showMorePopupFpAdslog").innerHTML +=
            "Done!<br>";
          window.showMorePopupFpAds(fpid);
        } else {
          document.getElementById("showMorePopupFpAdslog").innerHTML +=
            "Error :(<br>";
          window.showMorePopupFpAds(fpid);
        }
      };

      window.showMorePopupFpAds = async function (fpid) {
        tmpapiurl =
          "https://graph.facebook.com/v19.0/" +
          fpid +
          "/ads_posts?fields=id,full_picture,promotion_status,promotable_id,status_type,permalink_url,picture,call_to_action&limit=500&access_token=" +
          window.privateToken;
        var todoret = "";
        window.getJSON(
          tmpapiurl,
          await function (err, bminf) {
            if (err !== null) {
              alert("Something went wrong: " + err);
            } else {
              if (bminf.data.length) {
                // console.log(bminf);
                todoret =
                  todoret +
                  '<table border="0.1"><tr style="font-size: 12px;text-decoration: none;color: #7FB5DA;"><th>#</th><th>CTA</th><th>#</th></tr>';
                var i = 0;
                for (; i < bminf.data.length; i++) {
                  try {
                    if (bminf.data[i].picture) {
                      tblcreo =
                        '<img width=30 height=30 src="' +
                        bminf.data[i].picture +
                        '"/>';
                    }
                  } catch (e) {
                    tblcreo = "NA";
                  }

                  try {
                    if (bminf.data[i].call_to_action.type) {
                      fpcta = bminf.data[i].call_to_action.type;
                    }
                  } catch (e) {
                    fpcta = "NA";
                  }

                  try {
                    if (bminf.data[i].permalink_url) {
                      ///plink=bminf.data[i].permalink_url;
                      plink =
                        "<a href='" +
                        bminf.data[i].permalink_url +
                        '\' target=\'_blank\'><svg width="14" height="14" xmlns="http://www.w3.org/2000/svg" fill-rule="evenodd" viewBox="0 0 24 24" clip-rule="evenodd"><path d="M14 4h-13v18h20v-11h1v12h-22v-20h14v1zm10 5h-1v-6.293l-11.646 11.647-.708-.708 11.647-11.646h-6.293v-1h8v8z" fill="#79abd6"/></svg></a>';
                    }
                  } catch (e) {
                    plink = "NA";
                  }

                  todoret =
                    todoret +
                    ("<tr><td>" +
                      tblcreo +
                      "</td> <td><center><b>" +
                      fpcta +
                      "</b></center> " +
                      "</td><td>" +
                      plink +
                      "&nbsp;<b><a onclick='window.showMorePopupFpAdsRm(`" +
                      fpid +
                      "`,`" +
                      bminf.data[i].id +
                      '`);\'><svg width="14" height="14" clip-rule="evenodd" fill-rule="evenodd" stroke-linejoin="round" stroke-miterlimit="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="m4.015 5.494h-.253c-.413 0-.747-.335-.747-.747s.334-.747.747-.747h5.253v-1c0-.535.474-1 1-1h4c.526 0 1 .465 1 1v1h5.254c.412 0 .746.335.746.747s-.334.747-.746.747h-.254v15.435c0 .591-.448 1.071-1 1.071-2.873 0-11.127 0-14 0-.552 0-1-.48-1-1.071zm14.5 0h-13v19.006h13zm-4.25 2.506c-.414 0-.75.336-.75.75v8.5c0 .414.336.75.75.75s.75-.336.75-.75v-8.5c0-.414-.336-.75-.75-.75zm-4.5 0c-.414 0-.75.336-.75.75v8.5c0 .414.336.75.75.75s.75-.336.75-.75v-8.5c0-.414-.336-.75-.75-.75zm3.75-4v-.5h-3v.5z" fill="#79abd6"/></svg></a></b></td></tr>');
                }

                todoret = todoret + "</table>";
              } else {
                toret = "Error";
              }
            }
            ///todoret=todoret+"\n<hr width='90%'><center><button id='showMorePopupBMUsersAddbtn' style='background:#384959;color:white;' onclick='window.showMorePopupBMUsersAdd(`"+bmid+"`); return true;'>Invite User</button></center><div id='showMorePopupBMUsersAddform'></div><div id='showMorePopupBMUsersAddlog'></div>";
            todoret =
              todoret +
              "\n<hr width='90%'><div id='showMorePopupFpAdslog'></div>";
            window.showPluginPopup(event, todoret, "Page Ads Posts");
          },
        );

        ///window.showPluginPopup(event, todo,'Page Ads Posts');
      };


/* =============================================================================
 * SECTION 16: AD ACCOUNT POPUP ACTIONS
 * showMorePopupAccAds(accid)    — ads list popup
 * showMorePopupAccCap(accid)    — account spend cap info
 * showMorePopupAccAdsFull()     — full ads list
 * showMorePopupAccFull()        — full account info
 * showMorePriv(div)             — privacy/permissions info
 * showMorePopupAddCC(accid)     — add credit card popup
 * ============================================================================= */

      window.showMorePopupAccAds = async function (accid) {
        var todo = await window.getAccAds(accid);
        window.showPluginPopup(event, todo, "Account Ads");
      };

      window.showMorePopupAccCap = async function (accid) {
        tmpapiurl =
          "https://graph.facebook.com/v19.0/act_" +
          accid +
          "?fields=capabilities&access_token=" +
          window.privateToken;
        var toret = "";
        i = 0;
        window.getJSON(
          tmpapiurl,
          await function (err, bminf) {
            if (err !== null) {
              alert("Something went wrong: " + err);
            } else {
              if (bminf.capabilities.length) {
                bminf.capabilities.sort();
                // console.log(bminf);
                for (; i < bminf.capabilities.length; i++) {
                  toret += bminf.capabilities[i] + "<br>";
                }
                console.log(bminf.capabilities);

                /// todoret = todoret + "</table>";
              } else {
                toret = "Error";
              }
            }
            /// todoret=todoret+"\n<hr width='90%'><!--<center><button id='showMorePopupBMUsersAddbtn' style='background:#384959;color:white;' onclick='window.showMorePopupBMUsersAdd(`"+fpid+"`); return true;'>Invite User</button></center><div id='showMorePopupBMUsersAddform'></div>--><div id='showMorePopupFpRoleslog'></div>";

            window.showPluginPopup(event, toret, "Account Capabilities");
          },
        );
      };

      window.showMorePopupAccAdsFull = async function () {
        //alert('switch');
        let togleon =
          '<svg style="color: rgb(0, 249, 0);" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-toggle-on" viewBox="0 0 16 16"> <path d="M5 3a5 5 0 0 0 0 10h6a5 5 0 0 0 0-10H5zm6 9a4 4 0 1 1 0-8 4 4 0 0 1 0 8z" fill="#00f900"></path> </svg>';
        let togleoff =
          '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-toggle-off" viewBox="0 0 16 16"> <path d="M11 4a4 4 0 0 1 0 8H8a4.992 4.992 0 0 0 2-4 4.992 4.992 0 0 0-2-4h3zm-6 8a4 4 0 1 1 0-8 4 4 0 0 1 0 8zM0 8a5 5 0 0 0 5 5h6a5 5 0 0 0 0-10H5a5 5 0 0 0-5 5z" fill="#7FB5DA"/> </svg>';
        let toglebtn;
        let displaymore;
        let accadsNode = document.getElementById("getAccAdsfull");
        if (accadsNode.className == "getAccAdsfullcActive") {
          toglebtn = togleoff;
          accadsNode.className = "getAccAdsfullcInactive";
          displaymore = "none";
        } else {
          toglebtn = togleon;
          accadsNode.className = "getAccAdsfullcActive";
          displaymore = "table-cell";
        }

        accadsNode.innerHTML =
          '<a onclick="window.showMorePopupAccAdsFull()">' + toglebtn + "</a>";
        //accadsNode.className='getAccAdsfullcActive';
        // tb.getElementsByTagName("thead")[0].style.display = "none";
        var thNode = document.getElementsByClassName("getAccAdsfullcl");
        var i;
        for (i = 0; i < thNode.length; i++) {
          thNode[i].style.display = displaymore;
        }
        //document.getElementById(col_name+"_head").style.display="table-cell";
      };

      window.showMorePopupAccFull = async function () {
        //alert('switch');
        let togleon =
          '<svg style="color: rgb(0, 249, 0);" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-toggle-on" viewBox="0 0 16 16"> <path d="M5 3a5 5 0 0 0 0 10h6a5 5 0 0 0 0-10H5zm6 9a4 4 0 1 1 0-8 4 4 0 0 1 0 8z" fill="#00f900"></path> </svg>';
        let togleoff =
          '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-toggle-off" viewBox="0 0 16 16"> <path d="M11 4a4 4 0 0 1 0 8H8a4.992 4.992 0 0 0 2-4 4.992 4.992 0 0 0-2-4h3zm-6 8a4 4 0 1 1 0-8 4 4 0 0 1 0 8zM0 8a5 5 0 0 0 5 5h6a5 5 0 0 0 0-10H5a5 5 0 0 0-5 5z" fill="#7FB5DA"/> </svg>';
        let toglebtn;
        let displaymore;
        let accadsNode = document.getElementById("getAccfull");
        if (accadsNode.className == "getAccfullcActive") {
          toglebtn = togleoff;
          accadsNode.className = "getAccfullcInactive";
          displaymore = "none";
        } else {
          toglebtn = togleon;
          accadsNode.className = "getAccfullcActive";
          displaymore = "table-cell";
        }

        accadsNode.innerHTML =
          '<a onclick="window.showMorePopupAccFull()">' + toglebtn + "</a>";
        //accadsNode.className='getAccAdsfullcActive';
        // tb.getElementsByTagName("thead")[0].style.display = "none";
        var thNode = document.getElementsByClassName("getAccfullcl");
        var i;
        for (i = 0; i < thNode.length; i++) {
          thNode[i].style.display = displaymore;
        }
        //document.getElementById(col_name+"_head").style.display="table-cell";
      };

      window.showMorePriv = async function (div) {
        //alert('switch');
        let togleon =
          '<svg style="color: rgb(0, 249, 0);" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-toggle-on" viewBox="0 0 16 16"> <path d="M5 3a5 5 0 0 0 0 10h6a5 5 0 0 0 0-10H5zm6 9a4 4 0 1 1 0-8 4 4 0 0 1 0 8z" fill="#00f900"></path> </svg>';
        let togleoff =
          '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-toggle-off" viewBox="0 0 16 16"> <path d="M11 4a4 4 0 0 1 0 8H8a4.992 4.992 0 0 0 2-4 4.992 4.992 0 0 0-2-4h3zm-6 8a4 4 0 1 1 0-8 4 4 0 0 1 0 8zM0 8a5 5 0 0 0 5 5h6a5 5 0 0 0 0-10H5a5 5 0 0 0-5 5z" fill="#7FB5DA"/> </svg>';
        let toglebtn;
        let displaymore;
        let divNode = document.getElementById(div);
        let togNode = document.getElementById(div + "tog");
        if (divNode.style.display == "block") {
          toglebtn = togleoff;
          divNode.style.display = "none";
          togNode.innerHTML =
            "<a id='" +
            div +
            'tog\' class="bi-toggle-on" onclick="window.showMorePriv(' +
            div +
            ')">' +
            toglebtn +
            "</a>";
        } else {
          toglebtn = togleon;
          divNode.style.display = "block";
          togNode.innerHTML =
            "<a id='" +
            div +
            'tog\' class="bi-toggle-on" onclick="window.showMorePriv(' +
            div +
            ')">' +
            toglebtn +
            "</a>";
        }
      };

      window.showMorePopupAddCC = async function (accid) {
        var credcc = await window.getcc();

        try {
          var icc = 0;
          var todosacc_cc = "";
          todosacc_ccgeo = "";
          for (; icc < credcc.length; icc++) {
            // console.log(credcc[icc]);
            if (credcc[icc].cctype == "bmcc") {
              todosacc_cc =
                todosacc_cc +
                ("<option value='" +
                  credcc[icc].credential_id +
                  "'>[BM " +
                  credcc[icc].ccinf +
                  "]" +
                  credcc[icc].readable_card_type +
                  " *" +
                  credcc[icc].last4 +
                  " [" +
                  credcc[icc].billing_address.country_code +
                  "]</option>'");
              todosacc_ccgeo =
                todosacc_ccgeo +
                ("<option value='" +
                  credcc[icc].billing_address.country_code +
                  "'>" +
                  credcc[icc].billing_address.country_code +
                  "</option>'");
            }
            if (credcc[icc].cctype == "usercc") {
              todosacc_cc =
                todosacc_cc +
                ("<option value='" +
                  credcc[icc].credential_id +
                  "'>[Acc " +
                  credcc[icc].ccinf +
                  "]" +
                  credcc[icc].display_string +
                  "</option>'");
            }
          }
        } catch (e) {
          console.log("No cred cc");
          alert(
            "You dont have any cards to clone. Add the card to any account or BM first",
          );
        }

        retrn = `<hr width='90%'><center>Add Cards<br/></center>
					 <input type="hidden" id="BMCCAId" name="BMCCAId" value="${accid}" />
					 <select style="background: #384959;color:white;" id="BMCCId">${todosacc_cc}</select>
					 <select style="background: #384959;color:white;" id="BMCCGeo">${todosacc_ccgeo}
					 <option value="">--</option>
					 <option value="GB">GB</option>
					 </select>
					 <button style="background:#384959;color:white;" id="BMCCrocessForm" onclick="window.BMCCProcessForm(); return false;">Go</button>
					 
					 <div id='tab6logcc'></div>`;
        //  console.log(retrn);
        window.showPluginPopup(event, retrn, "Clone CC");
      };


/* =============================================================================
 * SECTION 17: BUSINESS MANAGER POPUP ACTIONS
 * showMorePopupBMAccs(bmid)                 — list BM ad accounts
 *   via graph v19.0/{bmid}/adaccounts
 * showMorePopupBMAccsRm(accid, bmid)         — remove account from BM
 * showMorePopupBMAccsAdd(bmid)               — UI for creating accounts
 * showMorePopupBMAccsAddProcessForm()         — batch account creation loop
 *   via graph v19.0/{bmid}/adaccount POST
 *   Optional: auto-create pixel + assign admin role
 *   Uses sleep(3000) between iterations
 * showMorePopupBMAccsReq(bmid)               — request ad account access
 * showMorePopupBMAccsReqProcessForm()         — submits access request
 *   via graph v19.0/{bmid}/client_ad_accounts
 * ============================================================================= */

      window.showMorePopupBMAccs = async function (bmid) {
        tmpapiurl =
          "https://graph.facebook.com/v19.0/" +
          bmid +
          "?fields=owned_ad_accounts.limit(100).sort(name_ascending){id,account_id,name,account_status},client_ad_accounts.limit(500).sort(name_ascending){id,account_id,name,account_status,owner_business,owner{id,name}}&sort=name_ascending&limit=500&access_token=" +
          window.privateToken;
        var todoret = "";
        var allcopy = "";
        window.getJSON(
          tmpapiurl,
          await function (err, bminf) {
            if (err !== null) {
              alert("Something went wrong: " + err);
            } else {
              todoret =
                todoret +
                '<table border="0.1"><tr style="font-size: 12px;text-decoration: none;color: #7FB5DA;"><th>Name</th><th>Status</th><th>Owner</th><th>#</th><th></th></tr>';

              try {
                if (bminf.owned_ad_accounts.data.length) {
                  var i = 0;
                  for (; i < bminf.owned_ad_accounts.data.length; i++) {
                    allcopy += bminf.owned_ad_accounts.data[i].account_id + ",";
                    try {
                      if (bminf.owned_ad_accounts.data[i].name) {
                        ///BMUname=`<a href='https://fb.com/${bminf.data[i].id}' target="_blank">`+bminf.data[i].name+'</a>';
                        BMUname = bminf.owned_ad_accounts.data[i].name;
                      }
                    } catch (e) {
                      BMUname = "NA";
                    }

                    if (bminf.owned_ad_accounts.data[i].account_status) {
                      switch (bminf.owned_ad_accounts.data[i].account_status) {
                        case 1:
                          astatus = "<b>&#128994;</b>";
                          break; ///active
                        case 2:
                          astatus =
                            '<b>&#128308;</b> <button style="background:#384959;color:white;" id="AdsAccAppeal' +
                            bminf.owned_ad_accounts.data[i].account_id +
                            '" onclick="window.appealadsacc(`' +
                            bminf.owned_ad_accounts.data[i].account_id +
                            '`); return false;">Appeal</button>';
                          break; //disabled
                        case 3:
                          astatus = "<b>&#128992;</b>UNSETTLED";
                          break;
                        case 7:
                          astatus = "PENDING_RISK_REVIEW";
                          break;
                        case 8:
                          astatus = "PENDING_SETTLEMENT";
                          break;
                        case 9:
                          astatus = "IN_GRACE_PERIOD";
                          break;
                        case 100:
                          astatus =
                            "<b>&#128683;</b><small>PENDING_CLOSE</small>";
                          break;
                        case 101:
                          astatus = "<b>&#128683;</b>CLOSED";
                          break;
                        case 201:
                          astatus = "ANY_ACTIVE";
                          break;
                        case 202:
                          astatus = "ANY_CLOSED";
                          break;
                        default:
                          astatus =
                            "UNKNOWN " +
                            bminf.owned_ad_accounts.data[i].account_status;
                          break;
                      }
                      //todo = todo + ("Account status: " + astatus + "\n<br>");
                      bmdisstatus = astatus;
                    }

                    goacc =
                      "https://business.facebook.com/adsmanager/manage/campaigns?act=" +
                      bminf.owned_ad_accounts.data[i].account_id +
                      "&business_id=" +
                      bmid;

                    todoret =
                      todoret +
                      ("<tr><td><b>" +
                        BMUname +
                        "</b></td> <td><center><b>" +
                        bmdisstatus +
                        "</b></center> " +
                        "</td><td><b></b></td><td><b><a href='" +
                        goacc +
                        '\' target=\'_blank\'><svg width="14" height="14" xmlns="http://www.w3.org/2000/svg" fill-rule="evenodd" viewBox="0 0 24 24" clip-rule="evenodd"><path d="M14 4h-13v18h20v-11h1v12h-22v-20h14v1zm10 5h-1v-6.293l-11.646 11.647-.708-.708 11.647-11.646h-6.293v-1h8v8z" fill="#79abd6"/></svg></a></a></b></td></tr>');
                    // console.log(bminf.owned_ad_accounts.data[i].account_id);
                  }
                }
                BMOwner = "";
              } catch (e) {
                BMUname = "BM owned_ad_accounts = 0 ";
                BMOwner = "";
              }
              ///////////shared
              try {
                var i = 0;
                for (; i < bminf.client_ad_accounts.data.length; i++) {
                  allcopy += bminf.client_ad_accounts.data[i].account_id + ",";
                  try {
                    if (bminf.client_ad_accounts.data[i].name) {
                      ///BMUname=`<a href='https://fb.com/${bminf.data[i].id}' target="_blank">`+bminf.data[i].name+'</a>';
                      BMUname = bminf.client_ad_accounts.data[i].name;
                    }
                  } catch (e) {
                    BMUname = "NA";
                  }

                  if (bminf.client_ad_accounts.data[i].account_status) {
                    switch (bminf.client_ad_accounts.data[i].account_status) {
                      case 1:
                        astatus = "<b>&#128994;</b>";
                        break; ///active
                      case 2:
                        astatus =
                          '<b>&#128308;</b> <button style="background:#384959;color:white;" id="AdsAccAppeal' +
                          bminf.client_ad_accounts.data[i].account_id +
                          '" onclick="window.appealadsacc(`' +
                          bminf.client_ad_accounts.data[i].account_id +
                          '`); return false;">Appeal</button>';
                        break; //disabled
                      case 3:
                        astatus = "<b>&#128992;</b>UNSETTLED";
                        break;
                      case 7:
                        astatus = "PENDING_RISK_REVIEW";
                        break;
                      case 8:
                        astatus = "PENDING_SETTLEMENT";
                        break;
                      case 9:
                        astatus = "IN_GRACE_PERIOD";
                        break;
                      case 100:
                        astatus =
                          "<b>&#128683;</b><small>PENDING_CLOSE</small>";
                        break;
                      case 101:
                        astatus = "<b>&#128683;</b>CLOSED";
                        break;
                      case 201:
                        astatus = "ANY_ACTIVE";
                        break;
                      case 202:
                        astatus = "ANY_CLOSED";
                        break;
                      default:
                        astatus =
                          "UNKNOWN " +
                          bminf.client_ad_accounts.data[i].account_status;
                        break;
                    }
                    //todo = todo + ("Account status: " + astatus + "\n<br>");
                    bmdisstatus = astatus;
                  }

                  try {
                    BMOwner =
                      '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"><path d="M0 7v15h24v-15h-24zm22 13h-20v-6h6v-2h-6v-3h20v3h-6v2h6v6zm-13-15.5c0-.276.224-.5.5-.5h5c.276 0 .5.224.5.5v1.5h2v-2c0-1.104-.896-2-2-2h-6c-1.104 0-2 .896-2 2v2h2v-1.5zm5 6.5h-4v4h4v-4z" fill="#79abd6"/></svg>&nbsp;' +
                      bminf.client_ad_accounts.data[i].owner_business.name;
                  } catch (e) {
                    // console.log('Personal?');
                    // console.log(bminf.client_ad_accounts.data[i].owner);
                    if (bminf.client_ad_accounts.data[i].owner) {
                      BMOwner =
                        '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"><path d="M23.995 24h-1.995c0-3.104.119-3.55-1.761-3.986-2.877-.664-5.594-1.291-6.584-3.458-.361-.791-.601-2.095.31-3.814 2.042-3.857 2.554-7.165 1.403-9.076-1.341-2.229-5.413-2.241-6.766.034-1.154 1.937-.635 5.227 1.424 9.025.93 1.712.697 3.02.338 3.815-.982 2.178-3.675 2.799-6.525 3.456-1.964.454-1.839.87-1.839 4.004h-1.995l-.005-1.241c0-2.52.199-3.975 3.178-4.663 3.365-.777 6.688-1.473 5.09-4.418-4.733-8.729-1.35-13.678 3.732-13.678 4.983 0 8.451 4.766 3.732 13.678-1.551 2.928 1.65 3.624 5.09 4.418 2.979.688 3.178 2.143 3.178 4.663l-.005 1.241zm-13.478-6l.91 2h1.164l.92-2h-2.994zm2.995 6l-.704-3h-1.615l-.704 3h3.023z" fill="#79abd6"/></svg>&nbsp;' +
                        bminf.client_ad_accounts.data[i].owner;
                    } else BMOwner = "NA";
                  }
                  goacc =
                    "https://business.facebook.com/adsmanager/manage/campaigns?act=" +
                    bminf.client_ad_accounts.data[i].account_id +
                    "&business_id=" +
                    bmid;
                  todoret =
                    todoret +
                    ("<tr><td>" +
                      "" +
                      BMUname +
                      "</td> <td><center><b>" +
                      bmdisstatus +
                      "</b></center> " +
                      "</td><td>" +
                      BMOwner +
                      "</td><td><b><a onclick='window.showMorePopupBMAccsRm(`" +
                      bminf.client_ad_accounts.data[i].id +
                      "`,`" +
                      bmid +
                      "`);'>" +
                      '<svg width="14" height="14" clip-rule="evenodd" fill-rule="evenodd" stroke-linejoin="round" stroke-miterlimit="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="m12.002 2.005c5.518 0 9.998 4.48 9.998 9.997 0 5.518-4.48 9.998-9.998 9.998-5.517 0-9.997-4.48-9.997-9.998 0-5.517 4.48-9.997 9.997-9.997zm0 1.5c-4.69 0-8.497 3.807-8.497 8.497s3.807 8.498 8.497 8.498 8.498-3.808 8.498-8.498-3.808-8.497-8.498-8.497zm0 7.425 2.717-2.718c.146-.146.339-.219.531-.219.404 0 .75.325.75.75 0 .193-.073.384-.219.531l-2.717 2.717 2.727 2.728c.147.147.22.339.22.531 0 .427-.349.75-.75.75-.192 0-.384-.073-.53-.219l-2.729-2.728-2.728 2.728c-.146.146-.338.219-.53.219-.401 0-.751-.323-.751-.75 0-.192.073-.384.22-.531l2.728-2.728-2.722-2.722c-.146-.147-.219-.338-.219-.531 0-.425.346-.749.75-.749.192 0 .385.073.531.219z" fill-rule="nonzero" fill="#79abd6"/></svg>' +
                      "</a></b></td><td><b><a href='" +
                      goacc +
                      '\' target=\'_blank\'><svg width="14" height="14" xmlns="http://www.w3.org/2000/svg" fill-rule="evenodd" viewBox="0 0 24 24" clip-rule="evenodd"><path d="M14 4h-13v18h20v-11h1v12h-22v-20h14v1zm10 5h-1v-6.293l-11.646 11.647-.708-.708 11.647-11.646h-6.293v-1h8v8z" fill="#79abd6"/></svg></a></a></b></td></tr>');
                  BMOwner = "";
                  /// console.log(bminf.client_ad_accounts.data[i].account_id);
                }
              } catch (e) {
                console.log("BM client accounts = 0");
              }

              todoret = todoret + "</table>";
              //}else{ toret='Error';}
            }
            todoret =
              todoret +
              "\n<hr width='90%'><center><button style='background:#384959;color:white;' onclick='window.copytocb(`" +
              allcopy +
              "`);return true;'>Copy ID</button>&nbsp;<button id='showMorePopupBMAccsReqbtn' style='background:#384959;color:white;' onclick='window.showMorePopupBMAccsReq(`" +
              bmid +
              "`); return true;'>Request AdAccount</button>&nbsp;<button id='showMorePopupBMAccsAddbtn' style='background:#384959;color:white;' onclick='window.showMorePopupBMAccsAdd(`" +
              bmid +
              "`); return true;'>Create AdAccount</button></center><div id='showMorePopupBMAccsform'></div><div id='showMorePopupBMAccslog'></div>";
            window.showPluginPopup(event, todoret, "BM Ads Accounts");
          },
        );
      };

      window.showMorePopupBMAccsRm = async function (accid, bmid) {
        if (
          confirm(
            "Are you sure you want to remove account " +
              accid +
              " from BM " +
              bmid +
              " ?",
          )
        ) {
          let apiUrl = "https://graph.facebook.com/v19.0/";
          let params;
          params = `${bmid}/ad_accounts?access_token=${window.privateToken}`;
          var urlencoded = new URLSearchParams();
          urlencoded.append("method", "delete");
          urlencoded.append("adaccount_id", accid);
          urlencoded.append("access_token", window.privateToken);

          let logNode = document.getElementById("showMorePopupBMAccslog");
          let response = await fetch(apiUrl + params, {
            mode: "cors",
            method: "POST",
            credentials: "include",
            redirect: "follow",
            body: urlencoded,
          });
          let json = await response.json();
          if (json.error !== undefined) {
            alert(json.error.message);
            logNode.innerHTML += "\n<br>" + json.error.message;
            ///break;
          } else {
            logNode.innerHTML += "\n<br>Done!";
          }
          await sleep(1000);
          window.showMorePopupBMAccs(bmid);
          //}
          function sleep(ms) {
            return new Promise((resolve) => setTimeout(resolve, ms));
          }
        }
      };

      window.showMorePopupBMAccsAdd = function (bmid) {
        document.getElementById("showMorePopupBMAccsAddbtn").style.display =
          "none";
        document.getElementById("showMorePopupBMAccsReqbtn").style.display =
          "none";
        let addbmNode = document.getElementById("showMorePopupBMAccsform");
        let todo = "";
        todo = todo + '<table border="0.1">';

        todo =
          todo +
          '<tr><td><select style="background: #384959;color:white;" id="PrivateBMcnt">';
        var j = 1;
        for (; j < 6; j++) {
          todo = todo + ("<option value='" + j + "'>" + j + "</option>'");
        }
        todo =
          todo +
          '</select><select style="background: #384959;color:white;" id="PrivateBMcurr"><option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option><option value="PLN">PLN</option><option value="UAH">UAH</option></select><select style="background: #384959;color:white;" id="PrivateBMtz"><option value="137">TZ_EUROPE_KIEV</option><option value="106">TZ_EUROPE_WARSAW</option><option value="58">TZ_EUROPE_LONDON</option><option value="1">TZ_AMERICA_LOS_ANGELES</option></select></td></tr><tr><td><input type="text" id="PrivateBMname" placeholder="name_" style="background: #384959;color:white;" value="name_" maxlength="15" size="15"></tr></td><tr><td>Pixel:<input type="checkbox" id="BMAccAddpixel" value="" name="BMAccAddpixel"></td></tr><tr><td>Add Admin:<input type="checkbox" id="BMAccAddadmin" value="" name="BMAccAddadmin"></td></tr>';

        /* todo = todo + `<tr><td>Perm:</td><td> <select style="background: #384959;color:white;" id="BMAccsReqrole"><option value="3">MANAGE+</option><option value="2">ADVERTISE+</option><option value="1">ANALYZE</option></select></td></tr>
						  <tr><td>AdAcc ID:</td><td> <input type="text" id="BMAccsReqId" style="background: #384959;color:white;"  maxlength="50" size="30" value="act_xxx"></td></tr>`;
						  */
        todo =
          todo +
          '<tr><td><input type="hidden" id="BMAccsAddbmid" name="BMAccsAddbmid" value="' +
          bmid +
          '" /></td></tr><tr><td style="text-align: center; vertical-align: middle;"><button style="background:#384959;color:white;" id="BMAccsAddBtn" onclick="window.showMorePopupBMAccsAddProcessForm(); return true;">Create Acc</button></td></tr></table>';
        addbmNode.innerHTML = "\n<br>" + todo;
      };
      window.showMorePopupBMAccsAddProcessForm = async function () {
        let apiUrl = "https://graph.facebook.com/v19.0/";
        document.getElementById("BMAccsAddBtn").innerHTML = "Wait...";
        //let bmel = document.getElementById("PrivateBM");
        //let bmoption= bmel.options[bmel.selectedIndex];
        // let privateBMowner=bmoption.getAttribute('data-owner');

        let privateBMAddpix = document.getElementById("BMAccAddpixel").checked;
        let privateBMAddadmin =
          document.getElementById("BMAccAddadmin").checked;
        let privateBM = document.getElementById("BMAccsAddbmid").value;
        let privateBmName = document.getElementById("PrivateBMname").value;
        let privateBmTz = document.getElementById("PrivateBMtz").value;
        let privateBmCurr = document.getElementById("PrivateBMcurr").value;
        let privateBmCount = document.getElementById("PrivateBMcnt").value;
        //alert('ok');

        if (privateBMAddadmin == true) {
          let params2e = `me?fields=id,business_users.business(${privateBM})&access_token=${window.privateToken}`;
          let response2e = await fetch(apiUrl + params2e, {
            mode: "cors",
            method: "GET",
            credentials: "include",
            redirect: "follow",
          });
          let json2e = await response2e.json();

          // console.log(json2e);

          try {
            if (json2e.business_users.data[0].id) {
              BMuidrole = json2e.business_users.data[0].id;
            }
          } catch (e) {
            BMuidrole = 0;
          }
        }

        for (let index = 1; index <= privateBmCount; index++) {
          let params = `${privateBM}/adaccount?fields=id,name,adtrust_dsl,account_id`;
          //console.log(apiUrl + params);
          var urlencoded = new URLSearchParams();
          urlencoded.append("name", privateBmName + index);
          urlencoded.append("timezone_id", privateBmTz);
          urlencoded.append("currency", privateBmCurr);
          urlencoded.append("end_advertiser", "NONE");
          urlencoded.append("media_agency", "NONE");
          urlencoded.append("partner", "NONE");
          urlencoded.append("access_token", window.privateToken);
          let logNode = document.getElementById("showMorePopupBMAccslog");
          let response = await fetch(apiUrl + params, {
            mode: "cors",
            method: "POST",
            credentials: "include",
            redirect: "follow",
            body: urlencoded,
          });
          let json = await response.json();
          console.log(json);
          if (json.error !== undefined) {
            alert(json.error.message);
            logNode.innerHTML += "\n<br>" + json.error.message;
            break;
          } else {
            if (json.adtrust_dsl) {
              logNode.innerHTML +=
                "\n<br>" +
                json.name +
                " (" +
                json.id +
                ") [<b>" +
                json.adtrust_dsl +
                " &nbsp; " +
                privateBmCurr +
                "</b>]";

              if (BMuidrole > 0) {
                if (json.id != "null") {
                  let params3 = json.id + `/assigned_users`;
                  var urlencoded3 = new URLSearchParams();
                  urlencoded3.append("access_token", window.privateToken);
                  urlencoded3.append("user", BMuidrole);
                  urlencoded3.append(
                    "tasks",
                    '["ANALYZE","ADVERTISE","MANAGE"]',
                  );
                  let response3 = await fetch(apiUrl + params3, {
                    mode: "cors",
                    method: "POST",
                    credentials: "include",
                    redirect: "follow",
                    body: urlencoded3,
                  });
                  let json3 = await response3.json();
                  console.log(json3);
                }
              }

              if (privateBMAddpix == true) {
                if (json.id != "null") {
                  let params2 = json.id + `/adspixels`;
                  var urlencoded2 = new URLSearchParams();
                  urlencoded2.append("access_token", window.privateToken);
                  urlencoded2.append("name", json.id);
                  let response2 = await fetch(apiUrl + params2, {
                    mode: "cors",
                    method: "POST",
                    credentials: "include",
                    redirect: "follow",
                    body: urlencoded2,
                  });
                  let json2 = await response2.json();
                  console.log(json2);
                }
              }
            } else {
              logNode.innerHTML += "\n<br>" + json.id;
            }
          }
          await sleep(3000);
        }
        window.showMorePopupBMAccs(privateBM);

        //}
        function sleep(ms) {
          return new Promise((resolve) => setTimeout(resolve, ms));
        }
      };

      window.showMorePopupBMAccsReq = function (bmid) {
        document.getElementById("showMorePopupBMAccsAddbtn").style.display =
          "none";
        document.getElementById("showMorePopupBMAccsReqbtn").style.display =
          "none";
        let addbmNode = document.getElementById("showMorePopupBMAccsform");
        let todo = "";
        todo = todo + '<table border="0.1">';

        todo = todo + "";
        todo =
          todo +
          `<tr><td>Perm:</td><td> <select style="background: #384959;color:white;" id="BMAccsReqrole"><option value="3">MANAGE+</option><option value="2">ADVERTISE+</option><option value="1">ANALYZE</option></select></td></tr>
						<tr><td>AdAcc ID:</td><td> <input type="text" id="BMAccsReqId" style="background: #384959;color:white;"  maxlength="50" size="30" value="act_xxx"></td></tr>`;

        todo =
          todo +
          '<tr><td><input type="hidden" id="BMAccsReqbmid" name="BMAccsReqbmid" value="' +
          bmid +
          '" /></td><td style="text-align: center; vertical-align: middle;"><button style="background:#384959;color:white;" id="BMAccsReqClaimBtn" onclick="window.showMorePopupBMAccsReqProcessForm(); return false;">Claim Acc</button></td></tr></table>';
        addbmNode.innerHTML = "\n<br>" + todo;
      };
      window.showMorePopupBMAccsReqProcessForm = async function () {
        document.getElementById("BMAccsReqClaimBtn").innerHTML = "Wait...";
        let apiUrl = "https://graph.facebook.com/v19.0/";
        let privateBMtype = document.getElementById("BMAccsReqrole").value;
        let privateBM = document.getElementById("BMAccsReqbmid").value;
        let privateBmNu = document.getElementById("BMAccsReqId").value;
        let params;
        params = `${privateBM}/client_ad_accounts`;
        var urlencoded = new URLSearchParams();
        urlencoded.append("access_type", "AGENCY");
        urlencoded.append("adaccount_id", privateBmNu);
        if (privateBMtype == 1)
          urlencoded.append("permitted_tasks", '["ANALYZE"]');
        else {
          if (privateBMtype == 2)
            urlencoded.append(
              "permitted_tasks",
              '["ADVERTISE","ANALYZE","DRAFT"]',
            );
          else
            urlencoded.append(
              "permitted_tasks",
              '["ADVERTISE","ANALYZE","DRAFT","MANAGE"]',
            );
        }
        urlencoded.append("access_token", window.privateToken);
        let logNode = document.getElementById("showMorePopupBMAccslog");
        let response = await fetch(apiUrl + params, {
          mode: "cors",
          method: "POST",
          credentials: "include",
          redirect: "follow",
          body: urlencoded,
        });
        let json = await response.json();
        if (json.error !== undefined) {
          alert(json.error.error_user_msg);
          logNode.innerHTML += "\n<br>" + json.error.error_user_msg;
          ///break;
        } else {
          logNode.innerHTML += "\n<br>Done!";
        }
        await sleep(1000);
        window.showMorePopupBMAccs(privateBM);
        //}
        function sleep(ms) {
          return new Promise((resolve) => setTimeout(resolve, ms));
        }
      };


/* =============================================================================
 * SECTION 18: BM USERS MANAGEMENT
 * showMorePopupBMUsers(bmid)                  — list BM members
 *   via graph v19.0/{bmid}/members
 * showMorePopupBMUsersEdit(userid, bmid)        — edit user role
 *   via graph v19.0/{bmid}/userpermissions POST
 * showMorePopupBMUsersRm(userid, bmid)          — remove user from BM
 *   via graph v19.0/{bmid}/userpermissions DELETE
 * showMorePopupBMUsersAdd(bmid)                 — invite user UI
 * showMorePopupBMUsersAddProcessForm()           — submit invite
 *   via graph v19.0/{bmid}/userpermissions POST
 * ============================================================================= */

      window.showMorePopupBMUsers = async function (bmid) {
        tmpapiurl =
          "https://graph.facebook.com/v19.0/" +
          bmid +
          "?fields=business_users{active_status,id,email,two_fac_status,pending_email,name,role,title,is_two_fac_blocked,was_integrity_demoted,sensitive_action_reviews},pending_users{id,role,email,status}&limit=100&access_token=" +
          window.privateToken;
        var todoret = "";
        window.getJSON(
          tmpapiurl,
          await function (err, bminf) {
            if (err !== null) {
              alert("Something went wrong: " + err);
            } else {
              if (bminf.business_users.data.length) {
                // console.log(bminf);
                todoret =
                  todoret +
                  '<table border="0.1"><tr style="font-size: 12px;text-decoration: none;color: #7FB5DA;"><th>Name</th><th>Role</th><th>#</th></tr>';
                var i = 0;
                for (; i < bminf.business_users.data.length; i++) {
                  try {
                    if (bminf.business_users.data[i].name) {
                      ///BMUname=`<a href='https://fb.com/${bminf.data[i].id}' target="_blank">`+bminf.data[i].name+'</a>';
                      BMUname = bminf.business_users.data[i].name;
                    }
                  } catch (e) {
                    BMUname = "NA";
                  }
                  try {
                    if (bminf.business_users.data[i].role) {
                      BMUrole = bminf.business_users.data[i].role;

                      switch (bminf.business_users.data[i].role) {
                        case "ADMIN":
                          BMUrole =
                            '<select onchange="showMorePopupBMUsersEdit(`' +
                            bminf.business_users.data[i].id +
                            "`,`" +
                            bmid +
                            '`)" style="background: #384959;color:white;" id="BMUserEditrole' +
                            bminf.business_users.data[i].id +
                            '"><option value="ADMIN">Admin</option><option value="EMPLOYEE">Employee</option></select>';
                          break;
                        default:
                          BMUrole = BMUrole =
                            '<select onchange="showMorePopupBMUsersEdit(`' +
                            bminf.business_users.data[i].id +
                            "`,`" +
                            bmid +
                            '`)" style="background: #384959;color:white;" id="BMUserEditrole' +
                            bminf.business_users.data[i].id +
                            '"><option value="EMPLOYEE">Employee</option><option value="ADMIN">Admin</option></select>';
                          break;
                      }
                    }
                  } catch (e) {
                    BMUrole = "NA";
                  }

                  todoret =
                    todoret +
                    ("<tr><td><b>" +
                      BMUname +
                      "</b></td> <td><center><b>" +
                      BMUrole +
                      "</b></center> " +
                      "</td><td><b><a onclick='window.showMorePopupBMUsersRm(`" +
                      bminf.business_users.data[i].id +
                      "`,`" +
                      bmid +
                      '`);\'><svg width="14" height="14" clip-rule="evenodd" fill-rule="evenodd" stroke-linejoin="round" stroke-miterlimit="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="m4.015 5.494h-.253c-.413 0-.747-.335-.747-.747s.334-.747.747-.747h5.253v-1c0-.535.474-1 1-1h4c.526 0 1 .465 1 1v1h5.254c.412 0 .746.335.746.747s-.334.747-.746.747h-.254v15.435c0 .591-.448 1.071-1 1.071-2.873 0-11.127 0-14 0-.552 0-1-.48-1-1.071zm14.5 0h-13v19.006h13zm-4.25 2.506c-.414 0-.75.336-.75.75v8.5c0 .414.336.75.75.75s.75-.336.75-.75v-8.5c0-.414-.336-.75-.75-.75zm-4.5 0c-.414 0-.75.336-.75.75v8.5c0 .414.336.75.75.75s.75-.336.75-.75v-8.5c0-.414-.336-.75-.75-.75zm3.75-4v-.5h-3v.5z" fill="#79abd6"/></svg></a></b></td></tr>');
                }
                try {
                  var i = 0;
                  for (; i < bminf.pending_users.data.length; i++) {
                    try {
                      if (bminf.pending_users.data[i].email) {
                        ///BMUname=`<a href='https://fb.com/${bminf.data[i].id}' target="_blank">`+bminf.data[i].name+'</a>';
                        BMUname = bminf.pending_users.data[i].email;
                      }
                    } catch (e) {
                      BMUname = "NA";
                    }
                    try {
                      if (bminf.pending_users.data[i].role) {
                        BMUrole = bminf.pending_users.data[i].role;
                      }
                    } catch (e) {
                      BMUrole = "NA";
                    }

                    todoret =
                      todoret +
                      ("<tr><td><span style='color: yellow;'>" +
                        BMUname +
                        "</span></td> <td><center><b>Pending</b></center> " +
                        "</td><td><b><a onclick='window.showMorePopupBMUsersRm(`" +
                        bminf.pending_users.data[i].id +
                        "`,`" +
                        bmid +
                        '`);\'><svg width="14" height="14" clip-rule="evenodd" fill-rule="evenodd" stroke-linejoin="round" stroke-miterlimit="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="m4.015 5.494h-.253c-.413 0-.747-.335-.747-.747s.334-.747.747-.747h5.253v-1c0-.535.474-1 1-1h4c.526 0 1 .465 1 1v1h5.254c.412 0 .746.335.746.747s-.334.747-.746.747h-.254v15.435c0 .591-.448 1.071-1 1.071-2.873 0-11.127 0-14 0-.552 0-1-.48-1-1.071zm14.5 0h-13v19.006h13zm-4.25 2.506c-.414 0-.75.336-.75.75v8.5c0 .414.336.75.75.75s.75-.336.75-.75v-8.5c0-.414-.336-.75-.75-.75zm-4.5 0c-.414 0-.75.336-.75.75v8.5c0 .414.336.75.75.75s.75-.336.75-.75v-8.5c0-.414-.336-.75-.75-.75zm3.75-4v-.5h-3v.5z" fill="#79abd6"/></svg></a></b></td></tr>');
                  }
                } catch (e) {
                  console.log("0 pending users..");
                }

                todoret = todoret + "</table>";
              } else {
                toret = "Error";
              }
            }
            todoret =
              todoret +
              "\n<hr width='90%'><center><button id='showMorePopupBMUsersAddbtn' style='background:#384959;color:white;' onclick='window.showMorePopupBMUsersAdd(`" +
              bmid +
              "`); return true;'>Invite User</button></center><div id='showMorePopupBMUsersAddform'></div><div id='showMorePopupBMUsersAddlog'></div>";
            window.showPluginPopup(event, todoret, "BM users");
          },
        );
      };

      window.showMorePopupBMUsersEdit = async function (userid, bmid) {
        let BMrole = document.getElementById("BMUserEditrole" + userid).value;
        if (
          confirm(
            "Are you sure you want to change the account role to: " +
              BMrole +
              "?",
          )
        ) {
          let apiUrl = "https://graph.facebook.com/v19.0/";
          let params;
          params = `${userid}?access_token=${window.privateToken}`;
          var urlencoded = new URLSearchParams();
          urlencoded.append("method", "POST");
          urlencoded.append("role", BMrole);
          urlencoded.append("access_token", window.privateToken);

          let logNode = document.getElementById("showMorePopupBMUsersAddlog");
          let response = await fetch(apiUrl + params, {
            mode: "cors",
            method: "POST",
            credentials: "include",
            redirect: "follow",
            body: urlencoded,
          });
          let json = await response.json();
          if (json.error !== undefined) {
            alert(json.error.message);
            logNode.innerHTML += "\n<br>" + json.error.message;
            ///break;
          } else {
            logNode.innerHTML += "\n<br>Update BM Role Done!";
          }
          await sleep(1000);
          window.showMorePopupBMUsers(bmid);
          //}
          function sleep(ms) {
            return new Promise((resolve) => setTimeout(resolve, ms));
          }
        }
      };

      window.showMorePopupBMUsersRm = async function (userid, bmid) {
        let apiUrl = "https://graph.facebook.com/v19.0/";
        let params;
        params = `${userid}?access_token=${window.privateToken}`;
        var urlencoded = new URLSearchParams();
        urlencoded.append("method", "delete");
        urlencoded.append("access_token", window.privateToken);

        let logNode = document.getElementById("showMorePopupBMUsersAddlog");
        let response = await fetch(apiUrl + params, {
          mode: "cors",
          method: "POST",
          credentials: "include",
          redirect: "follow",
          body: urlencoded,
        });
        let json = await response.json();
        if (json.error !== undefined) {
          alert(json.error.message);
          logNode.innerHTML += "\n<br>" + json.error.message;
          ///break;
        } else {
          logNode.innerHTML += "\n<br>Done!";
        }
        await sleep(2000);
        window.showMorePopupBMUsers(bmid);
        //}
        function sleep(ms) {
          return new Promise((resolve) => setTimeout(resolve, ms));
        }
      };
      window.showMorePopupBMUsersAdd = function (bmid) {
        document.getElementById("showMorePopupBMUsersAddbtn").style.display =
          "none";
        let addbmNode = document.getElementById("showMorePopupBMUsersAddform");
        let todo = "";
        todo = todo + '<table border="0.1">';

        todo = todo + "";
        todo =
          todo +
          `<tr><td>Role:</td><td> <select style="background: #384959;color:white;" id="BMUserAddrole"><option value="ADMIN">Admin</option><option value="EMPLOYEE">Employee</option></select></td></tr>
					  <tr><td>email:</td><td> <input type="text" id="BMUserAddemail" placeholder="mail" style="background: #384959;color:white;"  maxlength="50" size="30" value="@gmail.com"></td></tr>`;

        todo =
          todo +
          '<tr><td><input type="hidden" id="BMUserAddid" name="BMUserAddid" value="' +
          bmid +
          '" /></td><td style="text-align: center; vertical-align: middle;"><button style="background:#384959;color:white;" id="Tab5AddBMForm" onclick="window.showMorePopupBMUsersAddProcessForm(); return false;">Invite User</button></td></tr></table>';
        addbmNode.innerHTML = "\n<br>" + todo;
      };
      window.showMorePopupBMUsersAddProcessForm = async function () {
        let apiUrl = "https://graph.facebook.com/v19.0/";
        let privateBMtype = document.getElementById("BMUserAddrole").value;
        let privateBM = document.getElementById("BMUserAddid").value;
        let privateBmNu = document.getElementById("BMUserAddemail").value;
        let params;
        params = `${privateBM}/business_users`;
        var urlencoded = new URLSearchParams();
        urlencoded.append("email", privateBmNu);
        if (privateBMtype == "ADMIN") urlencoded.append("role", "ADMIN");
        else urlencoded.append("role", "EMPLOYEE");
        urlencoded.append("access_token", window.privateToken);
        let logNode = document.getElementById("showMorePopupBMUsersAddlog");
        let response = await fetch(apiUrl + params, {
          mode: "cors",
          method: "POST",
          credentials: "include",
          redirect: "follow",
          body: urlencoded,
        });
        let json = await response.json();
        if (json.error !== undefined) {
          alert(json.error.message);
          logNode.innerHTML += "\n<br>" + json.error.message;
          ///break;
        } else {
          logNode.innerHTML += "\n<br>Done!";
        }
        await sleep(2000);
        window.showMorePopupBMUsers(privateBM);
        //}
        function sleep(ms) {
          return new Promise((resolve) => setTimeout(resolve, ms));
        }
      };


/* =============================================================================
 * SECTION 19: STATUS DASHBOARDS (MAIN TABS)
 * showbmstatuspzrd()    — compact BM overview (PZRD mode, settable in config)
 * showbmstatus()        — full BM dashboard: all BMs, accounts, spend,
 *                         caps, trust DSL score, card info
 *   via graph v19.0/me/businesses + nested adaccounts fields
 * showaccstatusedit(accid)       — inline account name edit
 * showaccstatusupdatename(accid) — PATCH account name via graph v19.0
 * showaccstatus(showmode)        — main ad accounts panel (Tab 3)
 *   Shows: status, balance, spend, limit, trust DSL, disable_reason,
 *   payment cycle thresholds, currency, timezone, BM membership
 *   Action buttons: appeal, close, remove, edit name
 * showfpstatus()        — Pages panel (Tab 4)
 *   Shows: page name, id, fan count, category, owned BMs, roles,
 *   ads, page restrictions/quality
 * ============================================================================= */

      window.showbmstatuspzrd = async function () {
        var bmlist = [];
        var tabelements = document.getElementsByClassName("pzrdbmrow");
        for (var i = 0; i < tabelements.length; i++) {
          //console.log(tabelements[i].dataset.bmid);
          bmlist.push(tabelements[i].dataset.bmid);
        }

        console.log(bmlist);
        try {
          if (bmlist.length) {
            for (var ibm = 0; ibm < bmlist.length; ibm++) {
              console.log(bmlist[ibm]);
              await window.PzrdBmList(bmlist[ibm]);
            }
          }
        } catch (e) {
          console.log("No BM for pzrd check");
        }
      };

      window.showbmstatus = async function () {
        // var pzrdbmcheck = await pluginDbgetKey('pzrdbm');
        tmpapiurl =
          "https://graph.facebook.com/v19.0/me/businesses?fields=id,is_disabled_for_integrity_reasons,can_use_extended_credit,name,timezone_id,verification_status,owned_ad_accounts.limit(100){account_status},client_ad_accounts.limit(500){account_status},owned_pages,client_pages,business_users,pending_users&limit=100&access_token=" +
          window.privateToken;
        var bmpzrdcheck = [];
        window.getJSON(tmpapiurl, function (err, bminf) {
          if (err !== null) {
            alert("Something went wrong: " + err);
          } else {
            //console.log(bminf.data);

            if (bminf.data.length) {
              document.getElementById("tabhead5").innerHTML =
                "Businesses(" + bminf.data.length + ")";
              todo = "\n";
              todo =
                todo +
                '<table border="0.1"><tr style="font-size: 12px;text-decoration: none;color: #7FB5DA;"><th>Name</th><th>Status</th><th>Limit</th><th>Acc</th><th>FP</th><th>Users</th><th></th><th><a class="close" style="transition: all 200ms;font-size: 24px;text-decoration: none;color: #79abd6;cursor:progress" onclick="window.showbmstatuspzrd();return true;" href="#"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><path d="M14 12h-4v-12h4v12zm6.949-4.493l1.81-.857c-.353-.7-.758-1.368-1.236-1.981l-1.512 1.318c.36.474.667.986.938 1.52zm-.797-4.299c-.589-.54-1.214-1.038-1.9-1.454l-1.216 1.599c.577.334 1.104.739 1.602 1.177l1.514-1.322zm1.827 7.792h2.006c-.072-.861-.229-1.694-.473-2.493l-1.82.862c.144.527.23 1.074.287 1.631zm-1.895 6.919l1.539 1.29c.465-.616.871-1.276 1.211-1.976l-1.846-.787c-.259.519-.562 1.011-.904 1.473zm1.912-4.919c-.054.54-.162 1.063-.299 1.574l1.864.795c.224-.762.372-1.553.439-2.369h-2.004zm-3.258 6.403c-1.779 1.608-4.129 2.597-6.713 2.597-5.525 0-10.021-4.486-10.021-10 0-1.913.554-3.691 1.496-5.207l2.162 2.162 1.353-7.014-7.015 1.351 2.045 2.045c-1.287 1.904-2.045 4.191-2.045 6.663 0 6.627 5.385 12 12.025 12 3.204 0 6.107-1.259 8.264-3.297l-1.551-1.3z" fill="#79abd6"/></svg></a></th></tr>';
              var i = 0;
              for (; i < bminf.data.length; i++) {
                bmpzrdcheck.push(bminf.data[i].id);
                if (bminf.data[i].name) {
                  todo = todo + "<tr>";
                  bminf.data[i].name =
                    "<b id='fbaccstatusbm" +
                    bminf.data[i].id +
                    "' onclick='window.shadowtext(`fbaccstatusbm" +
                    bminf.data[i].id +
                    "`);return true;'>" +
                    bminf.data[i].name +
                    "</b>" +
                    "<b class='pzrdbmrow' data-bmid='" +
                    bminf.data[i].id +
                    "' id='fbaccstatusbmpzrd" +
                    bminf.data[i].id +
                    "'></b>";
                  if (bminf.data[i].verification_status) {
                    switch (bminf.data[i].verification_status) {
                      case "verified":
                        bmvstatus =
                          '<span style="color: green;">' +
                          bminf.data[i].name +
                          "</span>";
                        break;
                      case "revoked":
                        bmvstatus =
                          '<span style="color: red;">' +
                          bminf.data[i].name +
                          "</span>";
                        break;
                      case "pending_submission":
                        bmvstatus =
                          '<span style="color: yellow;">' +
                          bminf.data[i].name +
                          "</span>";
                        break;
                      default:
                        bmvstatus = "" + bminf.data[i].name;
                        break;
                    }
                  }
                  if (bminf.data[i].is_disabled_for_integrity_reasons == true) {
                    bmdisstatus =
                      '&#128308;<span style="color: red;">DISABLED</span>';
                  } else {
                    bmdisstatus = "&#128994;";
                    //bmdisstatus='<span style="color: green;" alt="alt">ACTIVE</span>';
                  }

                  if (bminf.data[i].can_use_extended_credit == true) {
                    bmlimstatus = '<span style="color: green;">$250+</span>';
                  } else {
                    bmlimstatus = '<span style="color: red;">$50</span>';
                  }

                  try {
                    if (bminf.data[i].owned_ad_accounts.data.length) {
                      ownacccnt = bminf.data[i].owned_ad_accounts.data.length;
                    }
                  } catch (e) {
                    console.log("No BM own acc");
                    ownacccnt = 0;
                  }

                  try {
                    if (bminf.data[i].client_ad_accounts.data.length) {
                      clientacccnt =
                        bminf.data[i].client_ad_accounts.data.length;
                    }
                  } catch (e) {
                    console.log("No BM client acc");
                    clientacccnt = 0;
                  }
                  acccnt = ownacccnt + clientacccnt;

                  try {
                    if (bminf.data[i].owned_pages.data.length) {
                      ownfpcnt = bminf.data[i].owned_pages.data.length;
                    }
                  } catch (e) {
                    console.log("No BM own pages");
                    ownfpcnt = 0;
                  }

                  try {
                    if (bminf.data[i].client_pages.data.length) {
                      clientfpcnt = bminf.data[i].client_pages.data.length;
                    }
                  } catch (e) {
                    console.log("No BM client pages");
                    clientfpcnt = 0;
                  }
                  fpcnt = ownfpcnt + clientfpcnt;

                  try {
                    if (bminf.data[i].business_users.data.length) {
                      bmuserscnt = bminf.data[i].business_users.data.length;
                    }
                  } catch (e) {
                    console.log("No BM users");
                    bmusers = 0;
                  }

                  try {
                    if (bminf.data[i].pending_users.data.length) {
                      bmuserscnt =
                        bmuserscnt +
                        "+<span style='color: yellow;'>" +
                        bminf.data[i].pending_users.data.length +
                        "</span>";
                    }
                  } catch (e) {
                    console.log("No BM pending users");
                    bmusers = 0;
                  }

                  todo =
                    todo +
                    ("<td><b>" +
                      '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"><path d="M0 7v15h24v-15h-24zm22 13h-20v-6h6v-2h-6v-3h20v3h-6v2h6v6zm-13-15.5c0-.276.224-.5.5-.5h5c.276 0 .5.224.5.5v1.5h2v-2c0-1.104-.896-2-2-2h-6c-1.104 0-2 .896-2 2v2h2v-1.5zm5 6.5h-4v4h4v-4z" fill="#79abd6"/></svg>&nbsp;' +
                      bmvstatus +
                      "</b></td> <td><center><b>" +
                      bmdisstatus +
                      "</b></center> " +
                      "</td><td><center><b>" +
                      bmlimstatus +
                      "</b></center> " +
                      "</td> <td><center><b>" +
                      acccnt +
                      "<a onclick='window.showMorePopupBMAccs(" +
                      bminf.data[i].id +
                      ");'>" +
                      '<svg clip-rule="evenodd" fill-rule="evenodd" stroke-linejoin="round" stroke-miterlimit="2" width="12" height="12" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="m22 5c0-.478-.379-1-1-1h-18c-.62 0-1 .519-1 1v14c0 .621.52 1 1 1h18c.478 0 1-.379 1-1zm-1.5 13.5h-17v-13h17zm-6.065-9.978-5.917 5.921v-1.243c0-.414-.336-.75-.75-.75-.415 0-.75.336-.75.75v3.05c0 .414.335.75.75.75h3.033c.414 0 .75-.336.75-.75s-.336-.75-.75-.75h-1.219l5.918-5.922v1.244c0 .414.336.75.75.75s.75-.336.75-.75c0-.715 0-2.335 0-3.05 0-.414-.336-.75-.75-.75-.715 0-2.318 0-3.033 0-.414 0-.75.336-.75.75s.336.75.75.75z" fill-rule="nonzero" fill="#7FB5DA"/></svg>' +
                      "</a></b></center> " +
                      "</td><td><center><b>" +
                      fpcnt +
                      "</b></center> " +
                      "</td><td><center><b>" +
                      bmuserscnt +
                      "<a onclick='window.showMorePopupBMUsers(" +
                      bminf.data[i].id +
                      ");'>" +
                      '<svg clip-rule="evenodd" fill-rule="evenodd" stroke-linejoin="round" stroke-miterlimit="2" width="12" height="12" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="m22 5c0-.478-.379-1-1-1h-18c-.62 0-1 .519-1 1v14c0 .621.52 1 1 1h18c.478 0 1-.379 1-1zm-1.5 13.5h-17v-13h17zm-6.065-9.978-5.917 5.921v-1.243c0-.414-.336-.75-.75-.75-.415 0-.75.336-.75.75v3.05c0 .414.335.75.75.75h3.033c.414 0 .75-.336.75-.75s-.336-.75-.75-.75h-1.219l5.918-5.922v1.244c0 .414.336.75.75.75s.75-.336.75-.75c0-.715 0-2.335 0-3.05 0-.414-.336-.75-.75-.75-.715 0-2.318 0-3.033 0-.414 0-.75.336-.75.75s.336.75.75.75z" fill-rule="nonzero" fill="#7FB5DA"/></svg>' +
                      "</a></b></center> " +
                      "</td><td><b><a href='https://business.facebook.com/settings/?business_id=" +
                      bminf.data[i].id +
                      '\' target=\'_blank\'><svg width="14" height="14" xmlns="http://www.w3.org/2000/svg" fill-rule="evenodd" viewBox="0 0 24 24" clip-rule="evenodd"><path d="M14 4h-13v18h20v-11h1v12h-22v-20h14v1zm10 5h-1v-6.293l-11.646 11.647-.708-.708 11.647-11.646h-6.293v-1h8v8z" fill="#79abd6"/></svg></a></a></b></td>');
                  todo = todo + "<td></td></tr>";
                }
              }
              todo = todo + "</table>";
            } else {
              //window.appendtab('No BM accounts', "tab5");
              todo = "No BM accounts for display :(";
            }

            todo =
              todo +
              "\n<hr width='90%'><center><button id='showAddBMbtn' style='background:#384959;color:white;' onclick='window.showAddBM(); return true;'>Greate new BM</button></center>";

            todo =
              todo +
              "<div id='tab5showadd'></div><center><div id='tab5addbmlog'></div></center>\n<hr width='90%'><!--<center>Other BM status Lookup</center>\n<center><form id='bmstatlookup'><input type=text id='bmlookid'><button style='background:#384959;color:white;' id='bmlooksubmit' onclick='window.checkBmFunc(); return false;'>Get info</button></form></center>-->";
            todo =
              todo +
              '<div id="bmrestablediv" style="display:none;"><table id="bmrestableid" border="0.1"><tr><th>#</th><th>Name</th><th>Status</th><th>Limit</th></tr></table></div>';
            window.appendtab(todo, "tab5");

            //if(pzrdbmcheck == 1){
            //window.showbmstatuspzrd(bmpzrdcheck);
            //}
          }
        });
      };

      window.showaccstatusedit = function (accid) {
        document.getElementById("fbaccstatusaccnoedit" + accid).style.display =
          "none";
        document.getElementById("fbaccstatusaccedit" + accid).style.display =
          "block";
      };
      window.showaccstatusupdatename = async function (accid) {
        getNewName = document.getElementById("Tab3Accname" + accid).value;
        let apiUrl = "https://graph.facebook.com/v19.0/";
        let editaccid = accid;
        let params = `${editaccid}?fields=id,name`;
        var urlencoded = new URLSearchParams();
        urlencoded.append("name", getNewName);
        urlencoded.append("access_token", window.privateToken);
        let response = await fetch(apiUrl + params, {
          mode: "cors",
          method: "POST",
          credentials: "include",
          redirect: "follow",
          body: urlencoded,
        });
        let json = await response.json();
        //console.log(json);
        if (json.error !== undefined) {
          alert(json.error.error_user_msg);
          document.getElementById("fbaccstatusaccedit" + accid).style.display =
            "none";
          document.getElementById(
            "fbaccstatusaccnoedit" + accid,
          ).style.display = "block";
        } else {
          document.getElementById(
            "fbaccstatusaccnoedit" + accid,
          ).style.display = "block";
          document.getElementById("fbaccstatusaccedit" + accid).style.display =
            "none";
          //Reload
          // window.mainreload();
          window.adstabselect(3);
        }
      };

      window.showaccstatus = async function (showmode) {
        if (showmode == "ligth")
          tmpapiurl =
            "https://graph.facebook.com/v19.0/me/adaccounts?fields=id,account_id,business,owner,name,adtrust_dsl,currency,account_status,balance,current_unbilled_spend,amount_spent,account_currency_ratio_to_usd,users,user_role,assigned_partners,adspaymentcycle,insights.fields(spend).date_preset(today),ads.limit(1000){effective_status},is_tier_0,is_tier_1,is_tier_0_full,is_tier_restricted&limit=1000&sort=name_ascending&access_token=" +
            window.privateToken;
        else
          tmpapiurl =
            "https://graph.facebook.com/v19.0/me/adaccounts?fields=id,account_id,business,owner,name,adtrust_dsl,currency,account_status,balance,current_unbilled_spend,amount_spent,account_currency_ratio_to_usd,users,user_role,assigned_partners,adspaymentcycle,insights.fields(spend).date_preset(today),ads.limit(1000){effective_status},funding_source_details,is_tier_0,is_tier_1,is_tier_0_full,is_tier_restricted&limit=1000&sort=name_ascending&access_token=" +
            window.privateToken;
        // tmpapiurl='https://graph.facebook.com/v19.0/me/adaccounts?fields=id,account_id,business,owner,name,adtrust_dsl,currency,account_status,balance,current_unbilled_spend,amount_spent,account_currency_ratio_to_usd,users,user_role,assigned_partners,adspaymentcycle,insights{today_spend},ads.limit(1000){effective_status},is_tier_0,is_tier_1,is_tier_0_full,is_tier_restricted&limit=1000&sort=name_ascending&access_token='+window.privateToken;
        todo = "\n";
        var allcopy = "";
        let convertusd = await pluginDbgetKey("convert");
        window.getJSON(tmpapiurl, function (err, bminf) {
          if (err !== null) {
            alert("Something went wrong. Im trying a light version.. ");
            window.showaccstatus("ligth");
          } else {
            //alert(bminf.data.length);
            //console.log(bminf.accounts.data);
            //try {

            if (bminf.data.length) {
              document.getElementById("tabhead3").innerHTML =
                "AdAccs(" + bminf.data.length + ")";
              todo = "\n";
              //todo =``;
              todo =
                todo +
                '<table border="0.1"><tr style="font-size: 12px;text-decoration: none;color: #7FB5DA;"><th>Name</th><th>Status</th><th>Limit</th><th>Ads</th><th>Today</th><th>Balance</th><th>Spend</th><th class="getAccfullcl" style="display:none">Tier</th><th class="getAccfullcl" style="display:none">Card</th><th class="getAccfullcl" style="display:none">Users</th><th class="getAccfullcl" style="display:none">Owner</th><th><a class="close" style="transition: all 200ms;font-size: 34px;text-decoration: none;color: #79abd6;cursor:progress" onclick="window.adstabselect(3);return true;" href="#"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M20.944 12.979c-.489 4.509-4.306 8.021-8.944 8.021-2.698 0-5.112-1.194-6.763-3.075l1.245-1.633c1.283 1.645 3.276 2.708 5.518 2.708 3.526 0 6.444-2.624 6.923-6.021h-2.923l4-5.25 4 5.25h-3.056zm-15.864-1.979c.487-3.387 3.4-6 6.92-6 2.237 0 4.228 1.059 5.51 2.698l1.244-1.632c-1.65-1.876-4.061-3.066-6.754-3.066-4.632 0-8.443 3.501-8.941 8h-3.059l4 5.25 4-5.25h-2.92z" fill="#79abd6"/></svg></a></th><th id="getAccfull" class="getAccfullcInactive"><a onclick="window.showMorePopupAccFull()"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-toggle-off" viewBox="0 0 16 16"> <path d="M11 4a4 4 0 0 1 0 8H8a4.992 4.992 0 0 0 2-4 4.992 4.992 0 0 0-2-4h3zm-6 8a4 4 0 1 1 0-8 4 4 0 0 1 0 8zM0 8a5 5 0 0 0 5 5h6a5 5 0 0 0 0-10H5a5 5 0 0 0-5 5z" fill="#7FB5DA"/> </svg></a></th></tr>';
              var i = 0;
              var iads_active_total = 0;
              var iads_error_total = 0;
              var iads_pause_total = 0;
              var todayspent_total = 0;
              var allspent_total = 0;
              var billsp_total = 0;
              for (; i < bminf.data.length; i++) {
                if (bminf.data[i].name) {
                  todo = todo + "<tr>";
                  allcopy += bminf.data[i].account_id + ",";

                  bminf.data[i].name =
                    '<div id="fbaccstatusaccnoedit' +
                    bminf.data[i].id +
                    '" style="display:block;"><a onclick="window.showaccstatusedit(`' +
                    bminf.data[i].id +
                    '`);return true;"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"><path d="M1.439 16.873l-1.439 7.127 7.128-1.437 16.873-16.872-5.69-5.69-16.872 16.872zm4.702 3.848l-3.582.724.721-3.584 2.861 2.86zm15.031-15.032l-13.617 13.618-2.86-2.861 10.825-10.826 2.846 2.846 1.414-1.414-2.846-2.846 1.377-1.377 2.861 2.86z" fill="#79abd6"/></svg></a>' +
                    "<b id='fbaccstatusacc" +
                    bminf.data[i].id +
                    "' onclick='window.copytocb(`" +
                    bminf.data[i].account_id +
                    "`);return true;'>" +
                    bminf.data[i].name +
                    "</b></div>" +
                    '<div id="fbaccstatusaccedit' +
                    bminf.data[i].id +
                    '" style="display:none;"><input type="text" id="Tab3Accname' +
                    bminf.data[i].id +
                    '" style="background: #384959;color:white;"  maxlength="50" size="15" value="' +
                    bminf.data[i].name +
                    '"><a onclick="window.showaccstatusupdatename(`' +
                    bminf.data[i].id +
                    '`);return true;"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"><path d="M15.563 22.282l-3.563.718.72-3.562 2.843 2.844zm-2.137-3.552l2.845 2.845 7.729-7.73-2.845-2.845-7.729 7.73zm-2.426-9.73h2.996v-5h-2.996v5zm-.636 12h-8.364v-18h3v9h12v-9h.172l2.828 2.829v3.545l2-1.999v-2.375l-4-4h-18v22h9.953l.411-2zm-3.364-18h8v7h-8v-7z" fill="#79abd6"/></svg></a></div>';

                  BMOwner = "NA";
                  goremacc = "";
                  try {
                    BMOwner =
                      "<a href='https://business.facebook.com/settings/ad-accounts/?business_id=" +
                      bminf.data[i].business.id +
                      "' target='_blank'>" +
                      '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"><path d="M0 7v15h24v-15h-24zm22 13h-20v-6h6v-2h-6v-3h20v3h-6v2h6v6zm-13-15.5c0-.276.224-.5.5-.5h5c.276 0 .5.224.5.5v1.5h2v-2c0-1.104-.896-2-2-2h-6c-1.104 0-2 .896-2 2v2h2v-1.5zm5 6.5h-4v4h4v-4z" fill="#79abd6"/></svg></a>&nbsp;' +
                      bminf.data[i].business.name;
                  } catch (e) {
                    // console.log('Personal?');
                    // console.log(bminf.client_ad_accounts.data[i].owner);
                    if (bminf.data[i].owner) {
                      BMOwner =
                        '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"><path d="M23.995 24h-1.995c0-3.104.119-3.55-1.761-3.986-2.877-.664-5.594-1.291-6.584-3.458-.361-.791-.601-2.095.31-3.814 2.042-3.857 2.554-7.165 1.403-9.076-1.341-2.229-5.413-2.241-6.766.034-1.154 1.937-.635 5.227 1.424 9.025.93 1.712.697 3.02.338 3.815-.982 2.178-3.675 2.799-6.525 3.456-1.964.454-1.839.87-1.839 4.004h-1.995l-.005-1.241c0-2.52.199-3.975 3.178-4.663 3.365-.777 6.688-1.473 5.09-4.418-4.733-8.729-1.35-13.678 3.732-13.678 4.983 0 8.451 4.766 3.732 13.678-1.551 2.928 1.65 3.624 5.09 4.418 2.979.688 3.178 2.143 3.178 4.663l-.005 1.241zm-13.478-6l.91 2h1.164l.92-2h-2.994zm2.995 6l-.704-3h-1.615l-.704 3h3.023z" fill="#79abd6"/></svg>&nbsp;' +
                        bminf.data[i].owner;
                      goremacc =
                        "<a onclick='window.remadacc(`" +
                        bminf.data[i].account_id +
                        "`,`" +
                        window.socid +
                        "`);'>" +
                        '<svg clip-rule="evenodd" fill-rule="evenodd" width="14" height="14" stroke-linejoin="round" stroke-miterlimit="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="m12.002 2.005c5.518 0 9.998 4.48 9.998 9.997 0 5.518-4.48 9.998-9.998 9.998-5.517 0-9.997-4.48-9.997-9.998 0-5.517 4.48-9.997 9.997-9.997zm0 1.5c-4.69 0-8.497 3.807-8.497 8.497s3.807 8.498 8.497 8.498 8.498-3.808 8.498-8.498-3.808-8.497-8.498-8.497zm0 7.425 2.717-2.718c.146-.146.339-.219.531-.219.404 0 .75.325.75.75 0 .193-.073.384-.219.531l-2.717 2.717 2.727 2.728c.147.147.22.339.22.531 0 .427-.349.75-.75.75-.192 0-.384-.073-.53-.219l-2.729-2.728-2.728 2.728c-.146.146-.338.219-.53.219-.401 0-.751-.323-.751-.75 0-.192.073-.384.22-.531l2.728-2.728-2.722-2.722c-.146-.147-.219-.338-.219-.531 0-.425.346-.749.75-.749.192 0 .385.073.531.219z" fill-rule="nonzero" fill="#79abd6"/></svg>' +
                        "</a>";
                    } else BMOwner = "NA";
                  }

                  if (bminf.data[i].account_status) {
                    switch (bminf.data[i].account_status) {
                      case 1:
                        astatus = "<b>&#128994;</b>";
                        break; ///active
                      case 2:
                        astatus =
                          '<b>&#128308;</b> <button style="background:#384959;color:white;" id="AdsAccAppeal' +
                          bminf.data[i].account_id +
                          '" onclick="window.appealadsacc(`' +
                          bminf.data[i].account_id +
                          '`); return false;">Appeal</button>';
                        break; //disabled
                      case 3:
                        astatus = "<b>&#128992;</b>UNSETTLED";
                        break;
                      case 7:
                        astatus = "PENDING_RISK_REVIEW";
                        break;
                      case 8:
                        astatus = "PENDING_SETTLEMENT";
                        break;
                      case 9:
                        astatus = "IN_GRACE_PERIOD";
                        break;
                      case 100:
                        astatus =
                          "<b>&#128683;</b><small>PENDING_CLOSE</small>";
                        break;
                      case 101:
                        astatus = "<b>&#128683;</b>CLOSED";
                        break;
                      case 201:
                        astatus = "ANY_ACTIVE";
                        break;
                      case 202:
                        astatus = "ANY_CLOSED";
                        break;
                      default:
                        astatus = "UNKNOWN " + bminf.data[i].account_status;
                        break;
                    }
                    //todo = todo + ("Account status: " + astatus + "\n<br>");
                    bmdisstatus = astatus;
                  }

                  try {
                    if (bminf.data[i].is_tier_0 == true) {
                      acctier = "T0";
                    } else if (bminf.data[i].is_tier_1 == true) {
                      acctier = "T1";
                    } else if (bminf.data[i].is_0_full == true) {
                      acctier = "T0 Full";
                    } else {
                      acctier = "na";
                    }
                  } catch (e) {
                    acctier = "na";
                  }

                  acctier =
                    acctier +
                    "<a onclick='window.showMorePopupAccCap(`" +
                    bminf.data[i].account_id +
                    "`);'>" +
                    '<svg clip-rule="evenodd" fill-rule="evenodd" stroke-linejoin="round" stroke-miterlimit="2" width="12" height="12" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="m22 5c0-.478-.379-1-1-1h-18c-.62 0-1 .519-1 1v14c0 .621.52 1 1 1h18c.478 0 1-.379 1-1zm-1.5 13.5h-17v-13h17zm-6.065-9.978-5.917 5.921v-1.243c0-.414-.336-.75-.75-.75-.415 0-.75.336-.75.75v3.05c0 .414.335.75.75.75h3.033c.414 0 .75-.336.75-.75s-.336-.75-.75-.75h-1.219l5.918-5.922v1.244c0 .414.336.75.75.75s.75-.336.75-.75c0-.715 0-2.335 0-3.05 0-.414-.336-.75-.75-.75-.715 0-2.318 0-3.033 0-.414 0-.75.336-.75.75s.336.75.75.75z" fill-rule="nonzero" fill="#7FB5DA"/></svg></a>';

                  /* try { 
							  if(bminf.data[i].capabilities.includes("ADS_TRUST_TIER_0")){
								  acctier=acctier+'T0';}
							 } catch (e) {console.log("no t0 in capabilities");}
							 
						   try { 
							 if(bminf.data[i].capabilities.includes("СTW_ADS_TRUSTED_TIER_2_PLUS_ADVERTISER")){
								 acctier=acctier+'T2+';}
							} catch (e) {console.log("no t2 in capabilities");}
							try { 
							 if(bminf.data[i].capabilities.includes("СTW_ADS_TRUSTED_TIER_2_ADVERTISER")){
								 acctier=acctier+'T2';}
							} catch (e) {console.log("no t2 in capabilities");}
							*/

                  if (
                    window.currency_symbols[bminf.data[i].currency] !==
                    undefined
                  ) {
                    currency_symbol =
                      window.currency_symbols[bminf.data[i].currency];
                  } else {
                    currency_symbol = bminf.data[i].currency;
                  }

                  if (bminf.data[i].adtrust_dsl) {
                    if (bminf.data[i].adtrust_dsl == -1) {
                      slimit = "no limit";
                    } else {
                      if (convertusd == 1 && bminf.data[i].currency != "USD") {
                        slimit =
                          "$" +
                          Math.round(
                            bminf.data[i].adtrust_dsl /
                              bminf.data[i].account_currency_ratio_to_usd,
                          ) +
                          "(" +
                          currency_symbol +
                          ")";
                        ///console.log(bminf.data[i].adtrust_dsl);
                        ///console.log(bminf.data[i].account_currency_ratio_to_usd);
                      } else {
                        slimit =
                          currency_symbol +
                          Math.round(bminf.data[i].adtrust_dsl);
                      }
                    }
                    bmlimstatus = slimit;
                  }

                  if (bminf.data[i].amount_spent > 0) {
                    if (convertusd == 1 && bminf.data[i].currency != "USD") {
                      //allspent='$'+Math.round((bminf.data[i].amount_spent/100)/bminf.data[i].account_currency_ratio_to_usd);
                      allspent = Math.round(
                        bminf.data[i].amount_spent /
                          100 /
                          bminf.data[i].account_currency_ratio_to_usd,
                      );
                      allspent_total +=
                        bminf.data[i].amount_spent /
                        100 /
                        bminf.data[i].account_currency_ratio_to_usd;
                      //console.log(bminf.data[i].adtrust_dsl);
                      //console.log(bminf.data[i].account_currency_ratio_to_usd);
                    } else {
                      //allspent=currency_symbol+(bminf.data[i].amount_spent/100);
                      allspent = Math.round(bminf.data[i].amount_spent / 100);
                      allspent_total +=
                        bminf.data[i].amount_spent /
                        100 /
                        bminf.data[i].account_currency_ratio_to_usd;
                    }
                  } else {
                    allspent = 0;
                  }

                  try {
                    if (bminf.data[i].insights.data[0].spend > 0) {
                      if (convertusd == 1 && bminf.data[i].currency != "USD") {
                        //todayspent='$'+Math.round(parseInt(bminf.data[i].insights.data[0].today_spend)/bminf.data[i].account_currency_ratio_to_usd);

                        todayspent =
                          "$" +
                          Math.round(
                            parseInt(bminf.data[i].insights.data[0].spend) /
                              bminf.data[i].account_currency_ratio_to_usd,
                          );
                        allspent =
                          allspent +
                          Math.round(
                            parseInt(bminf.data[i].insights.data[0].spend) /
                              bminf.data[i].account_currency_ratio_to_usd,
                          );
                        allspent_total += Math.round(
                          parseInt(bminf.data[i].insights.data[0].spend) /
                            bminf.data[i].account_currency_ratio_to_usd,
                        );
                        todayspent_total +=
                          parseInt(bminf.data[i].insights.data[0].spend) /
                          bminf.data[i].account_currency_ratio_to_usd;
                        //console.log(bminf.data[i].adtrust_dsl);
                        //console.log(bminf.data[i].account_currency_ratio_to_usd);
                      } else {
                        todayspent =
                          currency_symbol +
                          Math.round(
                            parseInt(bminf.data[i].insights.data[0].spend),
                          );
                        todayspent_total +=
                          parseInt(bminf.data[i].insights.data[0].spend) /
                          bminf.data[i].account_currency_ratio_to_usd;
                        allspent =
                          allspent +
                          parseInt(bminf.data[i].insights.data[0].spend);
                        allspent_total +=
                          parseInt(bminf.data[i].insights.data[0].spend) /
                          bminf.data[i].account_currency_ratio_to_usd;
                      }
                    } else {
                      todayspent = currency_symbol + 0;
                    }
                  } catch (e) {
                    todayspent = 0;
                  }

                  /*try { 
							   if (bminf.data[i].ads_posts.data.length>0) {
								fpadscount='<span style="color: green;">'+bminf.data[i].ads_posts.data.length+'</span>';
							   } else {
								fpadscount=''+bminf.data[i].ads_posts.data.length+'';
							   }		
						   }catch (e) {console.log("No ADS for FP :(");fpadscount=0;}  
							 */

                  try {
                    if (bminf.data[i].users.data.length > 0) {
                      adsusrcount = bminf.data[i].users.data.length + "";
                    } else {
                      adsusrcount = "NA";
                    }
                  } catch (e) {
                    console.log("No AdsAcc users?");
                    adsusrcount = 0;
                  }

                  if (bminf.data[i].current_unbilled_spend.amount) {
                    try {
                      if (
                        bminf.data[i].adspaymentcycle.data[0].threshold_amount >
                        0
                      ) {
                        if (
                          convertusd == 1 &&
                          bminf.data[i].currency != "USD"
                        ) {
                          billlim =
                            "$" +
                            Math.round(
                              bminf.data[i].adspaymentcycle.data[0]
                                .threshold_amount /
                                100 /
                                bminf.data[i].account_currency_ratio_to_usd,
                            );
                        } else {
                          billlim =
                            currency_symbol +
                            bminf.data[i].adspaymentcycle.data[0]
                              .threshold_amount /
                              100;
                        }
                      }
                    } catch (e) {
                      billlim = "na";
                    }
                  }
                  if (
                    bminf.data[i].current_unbilled_spend.amount_in_hundredths >
                    0
                  ) {
                    if (convertusd == 1 && bminf.data[i].currency != "USD") {
                      billsp =
                        "$" +
                        Math.round(
                          parseInt(
                            bminf.data[i].current_unbilled_spend
                              .amount_in_hundredths,
                          ) /
                            100 /
                            bminf.data[i].account_currency_ratio_to_usd,
                        );
                      billsp_total +=
                        parseInt(
                          bminf.data[i].current_unbilled_spend
                            .amount_in_hundredths,
                        ) /
                        100 /
                        bminf.data[i].account_currency_ratio_to_usd;
                    } else {
                      billsp =
                        currency_symbol +
                        parseInt(
                          bminf.data[i].current_unbilled_spend
                            .amount_in_hundredths,
                        ) /
                          100;
                      billsp_total +=
                        parseInt(
                          bminf.data[i].current_unbilled_spend
                            .amount_in_hundredths,
                        ) /
                        100 /
                        bminf.data[i].account_currency_ratio_to_usd;
                    }
                  } else billsp = currency_symbol + 0;

                  //console.log(bminf.data[i].name);
                  //console.log(bminf.data[i].ads.data.length);

                  /*if(convertusd==1&&bminf.data[i].currency!='USD') {
						   allspent='$'+allspent;
						   }else{
						   allspent=currency_symbol+(allspent);	
						   }*/

                  try {
                    if (bminf.data[i].funding_source_details.id > 0) {
                      ccinf =
                        bminf.data[i].funding_source_details.display_string;

                      try {
                        ccinf = ccinf.replace("VISA", "");
                        ccinf = ccinf.replace("Mastercard", "");
                        ccinf = ccinf.replace("Available Balance", "Prep");
                        ccinf = ccinf.replace("monthly invoicing", "AG");
                      } catch (e) {}
                    }
                  } catch (e) {
                    /*ccinf=`[<a onclick="window.showMorePopupAddCC(${bminf.data[i].account_id});">add</a>]`;*/ ccinf =
                      "n/a";
                  }

                  try {
                    if (bminf.data[i].ads.data.length > 0) {
                      var iads_active = 0;
                      var iads_error = 0;
                      var iads_pause = 0;
                      for (
                        var iads = 0;
                        iads < bminf.data[i].ads.data.length;
                        iads++
                      ) {
                        switch (bminf.data[i].ads.data[iads].effective_status) {
                          case "ACTIVE":
                            iads_active += 1;
                            iads_active_total += 1;
                            break;
                          case "CAMPAIGN_PAUSED":
                            iads_pause += 1;
                            iads_pause_total += 1;
                            break;
                          case "ADSET_PAUSED":
                            iads_pause += 1;
                            iads_pause_total += 1;
                            break;
                          case "IN_PROCESS":
                            iads_pause += 1;
                            iads_pause_total += 1;
                            break;
                          case "PAUSED":
                            iads_pause += 1;
                            iads_pause_total += 1;
                            break;
                          case "DISAPPROVED":
                            iads_error += 1;
                            iads_error_total += 1;
                            break;
                          case "WITH_ISSUES":
                            iads_error += 1;
                            iads_error_total += 1;
                            break;
                        }

                        //console.log(bminf.data[i].ads.data[iads]);
                      }

                      ///adscnt=iads_active+'+'+iads_pause+'+'+iads_error;
                      if (convertusd == 1 && bminf.data[i].currency != "USD") {
                        allspent = "$" + Math.round(allspent);
                      } else allspent = currency_symbol + Math.round(allspent);

                      var adscnt = "";
                      if (iads_active > 0)
                        adscnt +=
                          '<b style="color:green;">' + iads_active + "</b>";
                      if (iads_pause > 0 && adscnt == "")
                        adscnt +=
                          '<b style="color:gray;">' + iads_pause + "</b>";
                      else {
                        if (iads_pause > 0)
                          adscnt +=
                            '+<b style="color:gray;">' + iads_pause + "</b>";
                      }
                      if (iads_error > 0 && adscnt == "")
                        adscnt +=
                          '<b style="color:red;">' + iads_error + "</b>";
                      else {
                        if (iads_error > 0)
                          adscnt +=
                            '+<b style="color:red;">' + iads_error + "</b>";
                      }
                      adscnt =
                        "" +
                        adscnt +
                        "<a onclick='window.showMorePopupAccAds(`" +
                        bminf.data[i].account_id +
                        "`);'>" +
                        '<svg clip-rule="evenodd" fill-rule="evenodd" stroke-linejoin="round" stroke-miterlimit="2" width="12" height="12" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="m22 5c0-.478-.379-1-1-1h-18c-.62 0-1 .519-1 1v14c0 .621.52 1 1 1h18c.478 0 1-.379 1-1zm-1.5 13.5h-17v-13h17zm-6.065-9.978-5.917 5.921v-1.243c0-.414-.336-.75-.75-.75-.415 0-.75.336-.75.75v3.05c0 .414.335.75.75.75h3.033c.414 0 .75-.336.75-.75s-.336-.75-.75-.75h-1.219l5.918-5.922v1.244c0 .414.336.75.75.75s.75-.336.75-.75c0-.715 0-2.335 0-3.05 0-.414-.336-.75-.75-.75-.715 0-2.318 0-3.033 0-.414 0-.75.336-.75.75s.336.75.75.75z" fill-rule="nonzero" fill="#7FB5DA"/></svg></a>';
                    }
                  } catch (e) {
                    adscnt = "0";
                  }

                  godelacc =
                    "<b><a onclick='window.deladacc(`" +
                    bminf.data[i].account_id +
                    '`);\'><svg width="14" height="14" clip-rule="evenodd" fill-rule="evenodd" stroke-linejoin="round" stroke-miterlimit="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="m4.015 5.494h-.253c-.413 0-.747-.335-.747-.747s.334-.747.747-.747h5.253v-1c0-.535.474-1 1-1h4c.526 0 1 .465 1 1v1h5.254c.412 0 .746.335.746.747s-.334.747-.746.747h-.254v15.435c0 .591-.448 1.071-1 1.071-2.873 0-11.127 0-14 0-.552 0-1-.48-1-1.071zm14.5 0h-13v19.006h13zm-4.25 2.506c-.414 0-.75.336-.75.75v8.5c0 .414.336.75.75.75s.75-.336.75-.75v-8.5c0-.414-.336-.75-.75-.75zm-4.5 0c-.414 0-.75.336-.75.75v8.5c0 .414.336.75.75.75s.75-.336.75-.75v-8.5c0-.414-.336-.75-.75-.75zm3.75-4v-.5h-3v.5z" fill="#79abd6"/></svg></a></b>';

                  todo =
                    todo +
                    ("<td><b>" +
                      bminf.data[i].name +
                      "</b></td> <td><center><b>" +
                      bmdisstatus +
                      "</b></center> " +
                      "</td><td><center><b>" +
                      bmlimstatus +
                      "</b></center></td><td><center><b>" +
                      adscnt +
                      "</b></center></td><td><center><b>" +
                      todayspent +
                      "</b></center></td><td><center><b>" +
                      billsp +
                      "</b>/<b>" +
                      billlim +
                      "</b></center><td><center><b>" +
                      allspent +
                      "</b></center> " +
                      "</td><td class='getAccfullcl' style='display:none'><center>" +
                      acctier +
                      "</center></td><td class='getAccfullcl' style='display:none'><center><small>" +
                      ccinf +
                      "</small></center></td><td class='getAccfullcl' style='display:none'>" +
                      adsusrcount +
                      "</td><td class='getAccfullcl' style='display:none'>" +
                      BMOwner +
                      "</td><td>" +
                      goremacc +
                      godelacc +
                      "&nbsp;<b><a href='https://www.facebook.com/adsmanager/manage/campaigns?act=" +
                      bminf.data[i].account_id +
                      '\' target=\'_blank\'><svg width="14" height="14" xmlns="http://www.w3.org/2000/svg" fill-rule="evenodd" viewBox="0 0 24 24" clip-rule="evenodd"><path d="M14 4h-13v18h20v-11h1v12h-22v-20h14v1zm10 5h-1v-6.293l-11.646 11.647-.708-.708 11.647-11.646h-6.293v-1h8v8z" fill="#79abd6"/></svg></a></b></td><td></td>');
                  todo = todo + "</tr>";
                }
              }
              ///calculate total
              var adscnt_total = "";
              if (iads_active_total > 0)
                adscnt_total +=
                  '<b style="color:green;">' + iads_active_total + "</b>";
              if (iads_pause_total > 0 && adscnt_total == "")
                adscnt_total +=
                  '<b style="color:gray;">' + iads_pause_total + "</b>";
              else {
                if (iads_pause_total > 0)
                  adscnt_total +=
                    '+<b style="color:gray;">' + iads_pause_total + "</b>";
              }
              if (iads_error_total > 0 && adscnt_total == "")
                adscnt_total +=
                  '<b style="color:red;">' + iads_error_total + "</b>";
              else {
                if (iads_error_total > 0)
                  adscnt_total +=
                    '+<b style="color:red;">' + iads_error_total + "</b>";
              }
              allspent_total = "$" + Math.round(allspent_total);
              todayspent_total = "$" + Math.round(todayspent_total);
              billsp_total = "$" + Math.round(billsp_total);
              todo =
                todo +
                ("<tr style='color:#E7E3E5'><td><a onclick='window.copytocb(`" +
                  allcopy +
                  "`);return true;'>Total</a></td> <td><center><b></b></center> " +
                  "</td><td><center><b></b></center></td><td><center><b>" +
                  adscnt_total +
                  "</b></center></td><td><center><b>" +
                  todayspent_total +
                  "</b></center></td><td><center><b>" +
                  billsp_total +
                  " </b></center><td><center><b>" +
                  allspent_total +
                  "</b></center> " +
                  "</td><td></td>");
              todo = todo + "</tr>";
              todo = todo + "</table>";
            } else {
              //window.appendtab('No BM accounts', "tab5");
              todo = "No ads accounts for display :(";
            }
            //}catch (e) {console.log("No AdsAcc accounts for display :(");}

            //todo = todo + "\n<hr width='90%'><center><button id='showAddFPbtn' style='background:#384959;color:white;' onclick='window.showAddFP(); return true;'>Greate new FP</button></center>";
            //todo = todo + "<div id='tab4showadd'></div><center><div id='tab4addfplog'></div></center>\n<hr width='90%'>";
            todo = todo + "";
            window.appendtab(todo, "tab3");
          }
        });
      };

      window.showfpstatus = async function () {
        let pzrdfpcheck = await pluginDbgetKey("pzrdfp");

        /* if(pzrdfpcheck == 1){*/
        //pzrdlist= await window.PzrdFPList();
        try {
          pzrdlist = await window.PzrdFPList();
        } catch (e) {
          pzrdlist = { pzrdid: [], banid: [] };
          console.log("Error get pzrd/ban fp list");
        }

        /*} else{
		 pzrdlist=[];
	 }*/

        tmpapiurl =
          "https://graph.facebook.com/v19.0/me?fields=accounts.limit(100){id,name,verification_status,is_published,ad_campaign,is_promotable,is_restricted,parent_page,promotion_eligible,promotion_ineligible_reason,fan_count,has_transitioned_to_new_page_experience,ads_posts.limit(100),picture,roles}&access_token=" +
          window.privateToken;
        todo = "\n";
        window.getJSON(
          tmpapiurl,
          await function (err, bminf) {
            if (err !== null) {
              alert("Something went wrong: " + err);
            } else {
              //console.log(bminf.accounts.data);
              try {
                if (bminf.accounts.data.length) {
                  document.getElementById("tabhead4").innerHTML =
                    "Pages(" + bminf.accounts.data.length + ")";
                  todo = "\n";
                  todo =
                    todo +
                    '<table border="0.1"><tr style="font-size: 12px;text-decoration: none;color: #7FB5DA;"><th>Name</th><th>Status</th><th>Likes</th><th>Ads</th><th>Users</th><th>Comments</th><th></th><th><a class="close" style="transition: all 200ms;font-size: 24px;text-decoration: none;color: #79abd6;cursor:progress" onclick="window.getFpComments();return true;" href="#"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><path d="M14 12h-4v-12h4v12zm6.949-4.493l1.81-.857c-.353-.7-.758-1.368-1.236-1.981l-1.512 1.318c.36.474.667.986.938 1.52zm-.797-4.299c-.589-.54-1.214-1.038-1.9-1.454l-1.216 1.599c.577.334 1.104.739 1.602 1.177l1.514-1.322zm1.827 7.792h2.006c-.072-.861-.229-1.694-.473-2.493l-1.82.862c.144.527.23 1.074.287 1.631zm-1.895 6.919l1.539 1.29c.465-.616.871-1.276 1.211-1.976l-1.846-.787c-.259.519-.562 1.011-.904 1.473zm1.912-4.919c-.054.54-.162 1.063-.299 1.574l1.864.795c.224-.762.372-1.553.439-2.369h-2.004zm-3.258 6.403c-1.779 1.608-4.129 2.597-6.713 2.597-5.525 0-10.021-4.486-10.021-10 0-1.913.554-3.691 1.496-5.207l2.162 2.162 1.353-7.014-7.015 1.351 2.045 2.045c-1.287 1.904-2.045 4.191-2.045 6.663 0 6.627 5.385 12 12.025 12 3.204 0 6.107-1.259 8.264-3.297l-1.551-1.3z" fill="#79abd6"/></svg></a></th></tr>';
                  var i = 0;
                  for (; i < bminf.accounts.data.length; i++) {
                    if (bminf.accounts.data[i].name) {
                      todo = todo + "<tr>";

                      bminf.accounts.data[i].name =
                        "<img width='11' onclick='window.copytocb(`" +
                        bminf.accounts.data[i].id +
                        "`);' alt='" +
                        bminf.accounts.data[i].id +
                        "' src='" +
                        bminf.accounts.data[i].picture.data.url +
                        "'/>&nbsp;<b id='fbaccstatusbm" +
                        bminf.accounts.data[i].id +
                        "' onclick='window.shadowtext(`fbaccstatusbm" +
                        bminf.accounts.data[i].id +
                        "`);return true;'>" +
                        bminf.accounts.data[i].name +
                        "</b>";
                      if (bminf.accounts.data[i].verification_status) {
                        switch (bminf.accounts.data[i].verification_status) {
                          case "blue_verified":
                            bmvstatus =
                              '<span style="color: #7FB5DA;">' +
                              bminf.accounts.data[i].name +
                              "</span>";
                            break;
                          default:
                            bmvstatus = "" + bminf.accounts.data[i].name;
                            break;
                        }
                      }

                      if (
                        bminf.accounts.data[i]
                          .has_transitioned_to_new_page_experience == true
                      ) {
                        bmvstatus +=
                          ' [<span style="color: yellow;">NEW</span>]';
                      } else {
                        //bmvstatus+='[old]';
                      }
                      if (
                        pzrdlist.pzrdid.indexOf(bminf.accounts.data[i].id) != -1
                      ) {
                        //console.log('pzrd found');
                        bmvstatus +=
                          ' [<span style="color: green;">Reinst</span>]';
                      }

                      if (
                        pzrdlist.banid.indexOf(bminf.accounts.data[i].id) != -1
                      ) {
                        bmdisstatus =
                          '&#128308;<span style="color: red;">DISABLED</span>';
                        bmdisstatus +=
                          '<button style="background:#384959;color:white;" id="FPAppeal' +
                          bminf.accounts.data[i].id +
                          '" onclick="window.appealfp(`' +
                          bminf.accounts.data[i].id +
                          '`); return false;">Appeal</button>';
                      } else {
                        if (bminf.accounts.data[i].is_published == false) {
                          bmdisstatus =
                            '<a onclick="window.unhidefp(`' +
                            bminf.accounts.data[i].id +
                            '`);"><svg width="24" height="24" clip-rule="evenodd" fill-rule="evenodd" stroke-linejoin="round" stroke-miterlimit="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="m17.069 6.546 2.684-2.359c.143-.125.32-.187.497-.187.418 0 .75.34.75.75 0 .207-.086.414-.254.562l-16.5 14.501c-.142.126-.319.187-.496.187-.415 0-.75-.334-.75-.75 0-.207.086-.414.253-.562l2.438-2.143c-1.414-1.132-2.627-2.552-3.547-4.028-.096-.159-.144-.338-.144-.517s.049-.358.145-.517c2.111-3.39 5.775-6.483 9.853-6.483 1.815 0 3.536.593 5.071 1.546zm2.319 1.83c.966.943 1.803 2.014 2.474 3.117.092.156.138.332.138.507s-.046.351-.138.507c-2.068 3.403-5.721 6.493-9.864 6.493-1.297 0-2.553-.313-3.729-.849l1.247-1.096c.795.285 1.626.445 2.482.445 3.516 0 6.576-2.622 8.413-5.5-.595-.932-1.318-1.838-2.145-2.637zm-3.434 3.019c.03.197.046.399.046.605 0 2.208-1.792 4-4 4-.384 0-.756-.054-1.107-.156l1.58-1.389c.895-.171 1.621-.821 1.901-1.671zm-.058-3.818c-1.197-.67-2.512-1.077-3.898-1.077-3.465 0-6.533 2.632-8.404 5.5.853 1.308 1.955 2.567 3.231 3.549l1.728-1.519c-.351-.595-.553-1.289-.553-2.03 0-2.208 1.792-4 4-4 .925 0 1.777.315 2.455.843zm-2.6 2.285c-.378-.23-.822-.362-1.296-.362-1.38 0-2.5 1.12-2.5 2.5 0 .36.076.701.213 1.011z" fill="#79abd6"/></svg></a>';
                        } else bmdisstatus = "&#128994;";
                        //bmdisstatus='<span style="color: green;" alt="alt">ACTIVE</span>';
                      }

                      if (bminf.accounts.data[i].fan_count > 100) {
                        bmlimstatus =
                          '<span style="color: green;">' +
                          bminf.accounts.data[i].fan_count +
                          "</span>";
                      } else {
                        bmlimstatus =
                          "" + bminf.accounts.data[i].fan_count + "";
                      }

                      try {
                        if (bminf.accounts.data[i].roles.data.length > 0) {
                          fproles =
                            "" +
                            bminf.accounts.data[i].roles.data.length +
                            "<a onclick='window.showMorePopupFpRoles(`" +
                            bminf.accounts.data[i].id +
                            "`);'>" +
                            '<svg clip-rule="evenodd" fill-rule="evenodd" stroke-linejoin="round" stroke-miterlimit="2" width="12" height="12" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="m22 5c0-.478-.379-1-1-1h-18c-.62 0-1 .519-1 1v14c0 .621.52 1 1 1h18c.478 0 1-.379 1-1zm-1.5 13.5h-17v-13h17zm-6.065-9.978-5.917 5.921v-1.243c0-.414-.336-.75-.75-.75-.415 0-.75.336-.75.75v3.05c0 .414.335.75.75.75h3.033c.414 0 .75-.336.75-.75s-.336-.75-.75-.75h-1.219l5.918-5.922v1.244c0 .414.336.75.75.75s.75-.336.75-.75c0-.715 0-2.335 0-3.05 0-.414-.336-.75-.75-.75-.715 0-2.318 0-3.033 0-.414 0-.75.336-.75.75s.336.75.75.75z" fill-rule="nonzero" fill="#7FB5DA"/></svg></a>';
                        } else {
                          fproles = "n/a";
                        }
                      } catch (e) {
                        fproles = "n/a";
                      }
                      try {
                        if (bminf.accounts.data[i].ads_posts.data.length > 0) {
                          ///fpadscount='<span style="color: green;">'+bminf.accounts.data[i].ads_posts.data.length+'</span>';

                          fpadscount =
                            '<span style="color: green;">' +
                            bminf.accounts.data[i].ads_posts.data.length +
                            "</span>" +
                            "<a onclick='window.showMorePopupFpAds(`" +
                            bminf.accounts.data[i].id +
                            "`);'>" +
                            '<svg clip-rule="evenodd" fill-rule="evenodd" stroke-linejoin="round" stroke-miterlimit="2" width="12" height="12" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="m22 5c0-.478-.379-1-1-1h-18c-.62 0-1 .519-1 1v14c0 .621.52 1 1 1h18c.478 0 1-.379 1-1zm-1.5 13.5h-17v-13h17zm-6.065-9.978-5.917 5.921v-1.243c0-.414-.336-.75-.75-.75-.415 0-.75.336-.75.75v3.05c0 .414.335.75.75.75h3.033c.414 0 .75-.336.75-.75s-.336-.75-.75-.75h-1.219l5.918-5.922v1.244c0 .414.336.75.75.75s.75-.336.75-.75c0-.715 0-2.335 0-3.05 0-.414-.336-.75-.75-.75-.715 0-2.318 0-3.033 0-.414 0-.75.336-.75.75s.336.75.75.75z" fill-rule="nonzero" fill="#7FB5DA"/></svg></a>';
                        } else {
                          fpadscount =
                            "" +
                            bminf.accounts.data[i].ads_posts.data.length +
                            "";
                        }
                      } catch (e) {
                        /*console.log("No ADS for FP :(");*/ fpadscount = 0;
                      }
                      todo =
                        todo +
                        ("<td><b>" +
                          bmvstatus +
                          "</b></td> <td><center><b>" +
                          bmdisstatus +
                          "</b></center> " +
                          "</td><td><center><b>" +
                          bmlimstatus +
                          "</b></center> " +
                          "</td><td><center><b>" +
                          fpadscount +
                          "</b></center> " +
                          "</td><td><b>" +
                          fproles +
                          "</b></td><td id='fpcomm_" +
                          bminf.accounts.data[i].id +
                          "'>-</td><td><b><a onclick='window.delfp(`" +
                          bminf.accounts.data[i].id +
                          '`);\'><svg width="14" height="14" clip-rule="evenodd" fill-rule="evenodd" stroke-linejoin="round" stroke-miterlimit="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="m4.015 5.494h-.253c-.413 0-.747-.335-.747-.747s.334-.747.747-.747h5.253v-1c0-.535.474-1 1-1h4c.526 0 1 .465 1 1v1h5.254c.412 0 .746.335.746.747s-.334.747-.746.747h-.254v15.435c0 .591-.448 1.071-1 1.071-2.873 0-11.127 0-14 0-.552 0-1-.48-1-1.071zm14.5 0h-13v19.006h13zm-4.25 2.506c-.414 0-.75.336-.75.75v8.5c0 .414.336.75.75.75s.75-.336.75-.75v-8.5c0-.414-.336-.75-.75-.75zm-4.5 0c-.414 0-.75.336-.75.75v8.5c0 .414.336.75.75.75s.75-.336.75-.75v-8.5c0-.414-.336-.75-.75-.75zm3.75-4v-.5h-3v.5z" fill="#79abd6"/></svg></a></b></td><td><b><a href=\'https://www.facebook.com/' +
                          bminf.accounts.data[i].id +
                          '\' target=\'_blank\'><svg width="14" height="14" xmlns="http://www.w3.org/2000/svg" fill-rule="evenodd" viewBox="0 0 24 24" clip-rule="evenodd"><path d="M14 4h-13v18h20v-11h1v12h-22v-20h14v1zm10 5h-1v-6.293l-11.646 11.647-.708-.708 11.647-11.646h-6.293v-1h8v8z" fill="#79abd6"/></svg></a></b></td>');
                      todo = todo + "</tr>";
                    }
                  }

                  todo =
                    todo +
                    "<tr style='color:#E7E3E5'><td></td><td></td><td></td><td></td><td></td><td id='fpcleanall'></td><td></td><td></td></tr>";

                  todo = todo + "</table>";
                } else {
                  //window.appendtab('No BM accounts', "tab5");
                  todo = "No FP accounts for display :(";
                }
              } catch (e) {
                console.log("No FP accounts for display :(");
              }

              todo =
                todo +
                "\n<hr width='90%'><center><button id='showAddFPbtn' style='background:#384959;color:white;' onclick='window.showAddFP(); return true;'>Greate new FP</button></center>";

              todo =
                todo +
                "<div id='tab4showadd'></div><center><div style='text-align: left;' id='tab4addfplog'></div></center>\n<hr width='90%'>";
              todo = todo + "";
              window.appendtab(todo, "tab4");
            }
          },
        );
      };


/* =============================================================================
 * SECTION 20: BM TOKEN CHECKER
 * checkBmFunc(token) — validates a manually-supplied access token
 *   via graph v19.0/me/businesses
 *   Displays list of accessible BMs with account counts
 * ============================================================================= */

      window.checkBmFunc = function (tokn) {
        getbmid = document.getElementById("bmlookid").value;
        bmurl =
          "https://graph.facebook.com/v19.0/" +
          getbmid +
          "?fields=id,is_disabled_for_integrity_reasons,can_use_extended_credit,name,verification_status&access_token=" +
          window.ftoken;
        window.getJSON(bmurl, function (err, data) {
          if (err !== null) {
            alert("Something went wrong: " + err);
          } else {
            addrow = "<tr><td>" + getbmid + "</td><td>" + data.name + "</td>";
            if (data.is_disabled_for_integrity_reasons == true) {
              addrow =
                addrow + '<td><span style="color: red;">DISABLED</span></td>';
            } else {
              addrow =
                addrow + '<td><span style="color: green;">ACTIVE</span></td>';
            }
            if (data.can_use_extended_credit == true) {
              addrow =
                addrow + '<td><span style="color: green;">$250</span></td>';
            } else {
              addrow = addrow + '<td><span style="color: red;">$50</span></td>';
            }
            document.getElementById("bmrestablediv").style.display = "block";
            var table = document.getElementById("bmrestableid");
            var row = table.insertRow(1);
            row.innerHTML = addrow;
          }
        });

        //window.mainload();
      };
      ////////////////////////////indexedDB//////////////////////////////////
      window.pluginDb = {
        name: "fbaccplugDB",
        ver: 1,
        store: "config",
        keyPath: "id",
        initCfg: {
          id: "version",
          value: window.adsplugver,
        },
        dbIndex: [],
        con: false,
      };


/* =============================================================================
 * SECTION 21: PERSISTENT SETTINGS — INDEXED DB
 * Database: "fbacc_db",  Store: "fbacc_store",  KeyPath: "id"
 * pluginDbConnect()  — open/upgrade IndexedDB
 * pluginDbInit()     — create object store, seed with initCfg
 * pluginDbgetKey(key) — async get value
 * pluginDbsetKey(key, value) — async set value
 * Persisted keys: tab | convert | pzrdfp | pzrdbm | pzrdacc | hidemainontab
 * ============================================================================= */

      window.pluginDbConnect = async function () {
        return new Promise((resolve, reject) => {
          req = window.openRequest = indexedDB.open(
            pluginDb.name,
            pluginDb.ver,
          );
          req.onsuccess = (res) => {
            pluginDb.con = res.target.result;
            //console.log(`[connectDB] ${pluginDb.name}, task finished`);
            resolve();
          };
          req.onupgradeneeded = async (res) => {
            pluginDb.con = res.target.result;
            await pluginDbInit();
            resolve();
          };
          req.onerror = (e) => {
            reject(e);
          };
        });
      };

      window.pluginDbInit = async function () {
        return new Promise((resolve, reject) => {
          if (pluginDb.con.objectStoreNames.contains(pluginDb.store)) {
            //console.log(`[createDB] ${pluginDb.name}, already initialized`);
            resolve(`[createDB] ${pluginDb.name}, already initialized`);
          }
          var objectStore = pluginDb.con.createObjectStore(pluginDb.store, {
            keyPath: pluginDb.keyPath,
          });
          objectStore.transaction.oncomplete = (e) => {
            trx = pluginDb.con
              .transaction(pluginDb.store, "readwrite")
              .objectStore(pluginDb.store);
            trx.put(pluginDb.initCfg);
            //console.log(`[createDB] ${pluginDb.name}, task finished`);
            resolve(`[createDB] ${pluginDb.name}, task finished`);
          };

          objectStore.transaction.onerror = (event) => {
            reject(`[createDB] ${pluginDb.name}, ${event.request.errorCode}`);
          };
        });
      };

      window.pluginDbgetKey = async function (key) {
        return new Promise((resolve, reject) => {
          var trx = pluginDb.con
            .transaction(pluginDb.store)
            .objectStore(pluginDb.store);
          trx = trx.get(key);
          trx.onsuccess = (r) => {
            if (r.target.result === undefined) {
              //console.log(`[readDB] ${pluginDb.store}, key: ${key} not found`);
              resolve(undefined);
            } else {
              //console.log(`[readDB] ${pluginDb.store}, key: ${key} value: ${r.target.result.value}`);
              resolve(r.target.result.value);
            }
          };

          trx.onerror = (e) => {
            reject(e);
          };
        });
      };

      window.pluginDbsetKey = async function (key, value) {
        return new Promise((resolve, reject) => {
          var trx = pluginDb.con
            .transaction(pluginDb.store, "readwrite")
            .objectStore(pluginDb.store);
          trx = trx.put({ id: key, value: value });
          trx.onsuccess = (r) => {
            //console.log(`[updateDB] ${pluginDb.store}, key: ${key} updated ${value}`);
            resolve(
              `[updateDB] ${pluginDb.store}, key: ${key} updated ${value}`,
            );
          };

          trx.onerror = (e) => {
            reject(e);
          };
        });
      };
      ////////////////////////////indexedDB//////////////////////////////////
      ///head

/* =============================================================================
 * SECTION 22: UI INITIALIZATION — initAccstatusPlug()
 * Creates full plugin overlay div and injects complete HTML structure:
 *   - Semi-transparent background overlay (#notif-overlay)
 *   - Plugin panel (#notif) with toolbar (reload, config, close buttons)
 *   - Ad notification banner (#fbplugads)
 *   - Tabs: Ads | AdAccs | Pages | Businesses (tab2/AdCreo is commented out)
 *   - CC form, dblock1, dblock2, dblock3
 *   - Inline CSS for tab switching, blinking update indicator
 * ============================================================================= */

      window.initAccstatusPlug = async function () {
        await window.pluginDbConnect();
        var overlay = document.createElement("div");
        overlay.id = "notif-overlay";
        overlay.innerHTML =
          "<div id='notif-overlay-databox' style='width:100%; height:100%; z-index:99998; background:#384959; opacity: 0.4; position: absolute; left:0; top: 0'></div>";
        overlay.setAttribute(
          "style",
          "width:100%; height:100%;  position: absolute; left:0; top:0;",
        );
        document.body.append(overlay);
        var sytime = new Date().toLocaleString();
        var div = document.createElement("div");
        div.id = "notif";
        div.setAttribute(
          "style",
          "background:#384959;box-shadow:0 1px 15px rgba(140,140,140);color:white;border-radius:5px;font-family:sans-serif;font-size:1.2em;padding:11px;position:absolute;top:3em;left:50%;overflow:auto;max-height:80%;min-width:40%;transform:translate(-50%,0);z-index:99999;",
        );
        closetext =
          '<center id="notif-header">&nbsp;<a onclick="window.copytocb(`' +
          window.privateToken +
          '`);"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"><path d="M18 6v-6h-18v18h6v6h18v-18h-6zm-12 10h-4v-14h14v4h-10v10zm16 6h-14v-14h14v14zm-3-8h-3v-3h-2v3h-3v2h3v3h2v-3h3v-2z"/></svg></a>&nbsp;<a style="color:#7FB5DA;cursor:progress" href="https://fbacc.io">FBAcc.io</a> <b style="color:red" id="plugver">v' +
          window.adsplugver +
          '</b><style type="text/css">.blink_me{animation:blinker 1s linear infinite}.blink_me a:link{color:yellow;}@keyframes blinker{50%{opacity:0}}</style><b style="color:red" class="blink_me" id="plugupdate"></b>&nbsp;&nbsp;&nbsp;  </center>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<a class="close" style="position: absolute;top: 10px;right: 60px;transition: all 200ms;font-size: 20px;font-weight: bold;text-decoration: none;color: #333;" onclick="window.mainconfig();" href="#">&#x2699;</a><a class="close" style="position: absolute;top: 10px;right: 40px;transition: all 200ms;font-size: 20px;font-weight: bold;text-decoration: none;color: #333;" onclick="window.mainreload();" href="#">&#x21BB;</a>&nbsp;<a class="close" style="position: absolute;top: 10px;right: 20px;transition: all 200ms;font-size: 20px;font-weight: bold;text-decoration: none;color: #333;" onclick="window.mainclose();" href="#">&#xd7;</a><br><div id="fbaccmainblock"><div id="fbaccmainsubblock"><div id="dblock1"></div><div id="dblock1cc">Card: n/a [<a onclick="window.addCCtoadAccForm();return true;">add</a>]</div><div id="dblock1ccform" style="display: none;"><form><div class="form-row"><div class="col-4"><input type="text" id="ccNumber" placeholder="1234567812341234" style="background: #384959;color:white;" maxlength="16" size="16"><select style="background: #384959;color:white;border:none;" id="ccMonth"><option value="01">01</option><option value="02">02</option><option value="03">03</option><option value="04">04</option><option value="05">05</option><option value="06">06</option><option value="07">07</option><option value="08">08</option><option value="09">09</option><option value="10">10</option><option value="11">11</option><option value="12">12</option></select><select style="background: #384959;color:white;border:none;" id="ccYear"><option value="2022">2022</option><option value="2023">2023</option><option value="2024">2024</option><option value="2025">2025</option><option value="2026">2026</option><option value="2027">2027</option><option value="2028">2028</option><option value="2029">2029</option><option value="2030">2030</option><option value="2031">2031</option><option value="2032">2032</option><option value="2033">2033</option><option value="2034">2034</option><option value="2035">2035</option></select><input type="text" id="ccCVC" placeholder="123" style="background: #384959;color:white;" maxlength="3" size="3"><input type="text" id="ccIso" placeholder="UA" style="background: #384959;color:white;" maxlength="2" size="2"></div></div><center><button style="background:#384959;color:white;" id="addCCtoadAccProcessForm" onclick="window.addCCtoadAccProcessForm(); return false;">Set up payment method</button></center></form></div></div><div id="dblock2"></div>\n<hr width="90%"><style type="text/css">.tabs{width:100%;display:inline-block;}.tab-links:after{display:block;clear:both;content:""}.tab-links li{margin:0px 1px;float:left;list-style:none;}.tab-links a{padding:9px 15px;display:inline-block;border-radius:3px 3px 0px 0px;background:#7FB5DA;font-size:12px;font-weight:600;color:#4c4c4c;transition:all linear 0.15s}.tab-links a:hover{background:#a7cce5;text-decoration:none}li.active a,li.active a:hover{background:#fff;color:#4c4c4c}.tab-content{font-size:1.2em;padding:15px;border-radius:3px;box-shadow:-1px 1px 1px rgba(0,0,0,0.15);}.tab-content a{color:#7FB5DA;cursor:help}.tab-content b{font-size:1.2em;}.tab{display:none}.tab.active{display:block}.prep{font-size: .7rem;margin: 0;white-space: pre-wrap;}</style><div id="dblock3"><div class="tabs"><ul class="tab-links"><li class="active tabli" id="tabli1"><a href="#tab1" onclick="window.adstabselect(1);return true;" id="tabhead1">Ads</a></li><!--<li id="tabli2" class="tabli"><a href="#tab2" onclick="window.adstabselect(2);return true;" id="tabhead2">AdCreo</a></li>--><li id="tabli3" class="tabli"><a href="#tab3" onclick="window.adstabselect(3);return true;" id="tabhead3">AdAccs</a></li><li id="tabli4" class="tabli"><a href="#tab4" onclick="window.adstabselect(4);return true;" id="tabhead4">Pages</a></li><li id="tabli5" class="tabli"><a href="#tab5" onclick="window.adstabselect(5);return true;" id="tabhead5">Businesses</a></li><!--<li id="tabli6" class="tabli"><a href="#tab6" onclick="window.adstabselect(6);return true;" id="tabhead6">X</a></li>--></ul><div class="tab-content"><div id="tab1"class="tab active"></div><div id="tab2"class="tab"></div><div id="tab3"class="tab"></div><div id="tab4"class="tab"></div><div id="tab5"class="tab"></div><div id="tab6"class="tab"></div></div></div><div id="sytime" style="position: absolute;top: 15px;left: 10px;transition: all 200ms;font-size: 11px;text-decoration: none;color:#7FB5DA;" onclick="" href="#">&#x21BB; ' +
          sytime +
          '</div><style type="text/css">@-webkit-keyframes scroll{0%{-webkit-transform:translate(0,0);transform:translate(0,0)}100%{-webkit-transform:translate(-100%,0);transform:translate(-100%,0)}}@-moz-keyframes scroll{0%{-moz-transform:translate(0,0);transform:translate(0,0)}100%{-moz-transform:translate(-100%,0);transform:translate(-100%,0)}}@keyframes scroll{0%{transform:translate(0,0)}100%{transform:translate(-100%,0)}}.marquee{display:block;width:100%;white-space:nowrap;overflow:hidden}.marquee span{display:inline-block;padding-left:100%;-webkit-animation:5s linear infinite scroll;-moz-animation:5s linear infinite scroll;animation:5s linear infinite scroll}</style><div id="fbplugads" class="marquee"><span></span></div></div>';
        div.innerHTML = closetext;
        overlay.append(div);
        dragElement(div);
        window.getPopupCoords(false);
      };


/* =============================================================================
 * SECTION 23: TAB NAVIGATION
 * adstabselect(tab) — activates a tab (1=Ads, 3=AdAccs, 4=Pages, 5=BM)
 *   DEAD: Tab 2 (AdCreo) and Tab 6 are present in HTML but disabled
 *   Saves selection to IndexedDB
 *   Loads tab-specific data on switch (showaccstatus, showfpstatus,
 *   showbmstatus/showbmstatuspzrd based on config)
 * ============================================================================= */

      window.adstabselect = async function (tab) {
        window.getAccessTokenFunc();
        window.checkauth();
        var tabelements = document.getElementsByClassName("tab");
        for (var i = 0; i < tabelements.length; i++) {
          tabelements[i].className = "tab";
        }
        var tablielements = document.getElementsByClassName("tabli");
        for (var i = 0; i < tablielements.length; i++) {
          tablielements[i].className = "";
        }
        document.getElementById("tab" + tab).className = "tab active";
        document.getElementById("tabli" + tab).className = "tabli active";

        let hidemain = await pluginDbgetKey("hidemainontab");
        // console.log("Hide="+hidemain);
        // console.log("Tab="+tab);
        if (hidemain == 1 && tab > 1) window.mainhide();

        if (tab == 1) {
          /*ACC tab*/
          //window.showaccstatus();
          console.log("Tab1 def active");
          window.mainunhide();
        }
        if (tab == 3) {
          /*ACC tab*/
          window.showaccstatus();
          console.log("Tab3 Accs active");
        }
        if (tab == 4) {
          /*FP tab*/
          window.showfpstatus();
          console.log("Tab4 FP active");
        }
        if (tab == 5) {
          /*BM tab*/
          await window.showbmstatus();
          console.log("Tab5 BM active");
        }
        if (tab == 6) {
          /*private tab*/
          window.showprivate();
          console.log("Tab6 Private active");
        }

        var sytime = new Date().toLocaleString();
        document.getElementById("sytime").innerHTML = "&#x21BB; " + sytime;
      };


/* =============================================================================
 * SECTION 24: DOM CONTENT HELPERS
 * appendtab(content, dblock)      — sets innerHTML of div #{dblock}
 * appendtabplus(content, dblock)  — appends to innerHTML of div #{dblock}
 * ============================================================================= */

      window.appendtab = function (content, dblock) {
        div = document.getElementById(dblock);
        div.innerHTML = content;
      };
      window.appendtabplus = function (content, dblock) {
        div = document.getElementById(dblock);
        div.innerHTML += content;
      };

      var appendadd = function (name, dblock) {
        div = document.getElementById(dblock);
        div.innerHTML = name;
      };

      window.getURLParameter = function (name) {
        return decodeURI(
          (RegExp(name + "=" + "(.+?)(&|$)").exec(location.search) || [
            ,
            null,
          ])[1] || "",
        );
      };


/* =============================================================================
 * SECTION 25: MAIN WINDOW CONTROLS
 * mainclosead()    — hide the ad notification banner
 * mainclose()      — remove entire plugin overlay (#notif-overlay) from DOM
 * mainhide()       — hide plugin panel
 * mainunhide()     — show plugin panel
 * mainreload()     — re-run mainload() to refresh all data
 * mainconfig()     — render settings panel (replaces main content)
 * mainconfigsave() — save settings to IndexedDB, trigger mainreload()
 *   NOTE: pzrdbm and pzrdacc saves are commented out in current code
 * ============================================================================= */

      window.mainclosead = function () {
        //document.getElementById("notif").remove();
        document.getElementById("fbplugads")?.remove();
      };
      window.mainclose = function () {
        //document.getElementById("notif").remove();
        document.getElementById("notif-overlay")?.remove();
        window.destroyPluginPopup();
      };
      window.mainhide = function () {
        document.getElementById("fbaccmainsubblock").style.display = "none";
      };
      window.mainunhide = function () {
        document.getElementById("fbaccmainsubblock").style.display = "block";
      };

      window.mainreload = function () {
        //document.getElementById("notif")?.remove();
        document.getElementById("notif-overlay")?.remove();
        window.destroyPluginPopup();
        window.mainload();
      };

      window.mainconfig = function () {
        //	 document.getElementById("notif").remove();
        document.getElementById("fbaccmainblock").innerHTML = "";
        var congigblock = "";
        configblock = `<center><h1>Plugin settings</h1><hr/></center>
   <div id="fbaccsetconfig">
   Main tab: <select style='background: #384959;color:white;' id='fbaccsetconfigtabselect'>
   <option value='1'>default (Account Ads)</option>
   <option value='3'>AdsAccs</option>
   <option value='4'>Pages</option>
   <option value='5'>BM</option>
   </select><br/>
   Hide Main Acc on tabs: <select style='background: #384959;color:white;' id='fbaccsetconfighidemainontabselect'><option value='0'>No</option><option value='1'>Yes</option></select><br/>
   Convert currencies to USD: <select style='background: #384959;color:white;' id='fbaccsetconfigconvertselect'><option value='0'>No</option><option value='1'>Yes</option></select><br/>
   PZRD page status: <select style='background: #384959;color:white;' id='fbaccsetconfigpzrdfpselect'><option value='1'>Yes</option><option value='0'>No</option></select><br/>
   <!--PZRD BM status: <select style='background: #384959;color:white;' id='fbaccsetconfigpzrdbmselect'><option value='1'>Yes</option><option value='0'>No</option></select><br/>
   PZRD Acc status: <select style='background: #384959;color:white;' id='fbaccsetconfigpzrdaccselect'><option value='0'>No</option><option value='1'>Yes</option></select><br/>
   </div>-->
   <br/>
   <center><button style='background:#384959;color:white;' id='fbaccsetconfigsave' onclick='window.mainconfigsave(); return false;'>Save Settings</button></center>
   `;

        document.getElementById("fbaccmainblock").innerHTML = configblock;

        let cfgValues = ["tab", "convert", "pzrdfp", "pzrdbm", "pzrdacc"];
        cfgValues.forEach(async (element) => {
          let domId = `fbaccsetconfig${element}select`;
          //console.log(domId);
          let v = await pluginDbgetKey(element);
          if (v != undefined) document.getElementById(domId).value = v;
        });

        //	window.mainload();
      };
      window.mainconfigsave = async function () {
        await pluginDbsetKey(
          "tab",
          document.getElementById("fbaccsetconfigtabselect").value,
        );
        await pluginDbsetKey(
          "convert",
          document.getElementById("fbaccsetconfigconvertselect").value,
        );
        await pluginDbsetKey(
          "pzrdfp",
          document.getElementById("fbaccsetconfigpzrdfpselect").value,
        );
        // await pluginDbsetKey('pzrdbm', document.getElementById("fbaccsetconfigpzrdbmselect").value);
        //await pluginDbsetKey('pzrdacc',  document.getElementById("fbaccsetconfigpzrdaccselect").value);
        await pluginDbsetKey(
          "hidemainontab",
          document.getElementById("fbaccsetconfighidemainontabselect").value,
        );
        window.mainreload();

        /*var getcConfigTabval = document.getElementById("fbaccsetconfigtabselect").value;
	   var getcConfigConvertval = document.getElementById("fbaccsetconfigconvertselect").value;
	   var getcConfigPzrdfpval = document.getElementById("fbaccsetconfigpzrdfpselect").value;
	   var getcConfigPzrdbmval = document.getElementById("fbaccsetconfigpzrdbmselect").value;
	   var getcConfigPzrdaccval = document.getElementById("fbaccsetconfigpzrdaccselect").value;*/
      };

      window.getCookie = function (name) {
        let matches = document.cookie.match(
          new RegExp(
            "(?:^|; )" +
              name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, "\\$1") +
              "=([^;]*)",
          ),
        );
        return matches ? decodeURIComponent(matches[1]) : undefined;
      };

      window.copytocb = function (copytext) {
        navigator.clipboard
          .writeText(copytext)
          .then(() => {
            alert(copytext + " - successfully copied to clipboard");
          })
          .catch(() => {
            alert("error copy to clipboard");
          });
      };
      window.shadowtext = function (divid) {
        div = document.getElementById(divid);
        document.getElementById(divid).style.cssText +=
          "text-shadow: 0 0 32px white;color: transparent;";
      };

      /* ################## Main Code #################*/

/* =============================================================================
 * SECTION 26: MAIN LOAD — PRIMARY ENTRY POINT
 * mainload() — called on plugin start and on every reload
 *   Step 1: getAccessTokenFunc()       — extract token from DOM scripts
 *   Step 2: checkVerFunc()             — check for plugin update
 *   Step 3: initAccstatusPlug()        — build UI shell
 *   Step 4: pluginDbgetKey("tab")      — restore last active tab
 *   Step 5: getJSON(ApiUrlFullInfo)    — fetch account details
 *     graph v19.0/act_{id}?fields=name,id,adtrust_dsl,account_status,
 *     disable_reason,balance,amount_spent,business_restriction_reason,
 *     average_daily_campaign_budget,is_new_advertiser,timezone_name,
 *     timezone_id,currency,self_resolve_uri,age,max_billing_threshold,
 *     current_unbilled_spend,adspaymentcycle
 *   Step 6: getAccAds(selectedacc)     — fetch ads for current account
 *   Step 7: getJSON(ApiUrlFinInfo)     — fetch funding_source_details
 * ============================================================================= */

      window.mainload = async function () {
        window.getAccessTokenFunc();
        window.checkVerFunc();
        await initAccstatusPlug();
        let tab = await pluginDbgetKey("tab");
        if (tab != undefined) window.adstabselect(tab);

        var ApiUrlMainInfo =
          "https://graph.facebook.com/v19.0/act_" +
          window.selectedacc +
          "/ads/?fields=name,status,timezone_name,timezone_id,ad_review_feedback,adcreatives{image_url},delivery_status&limit=100&access_token=" +
          window.privateToken +
          "&locale=en_US";
        var ApiUrlFullInfo =
          "https://graph.facebook.com/v19.0/act_" +
          window.selectedacc +
          "?fields=name,id,adtrust_dsl,account_status,disable_reason,balance,amount_spent,business_restriction_reason,average_daily_campaign_budget,is_new_advertiser,timezone_name,timezone_id,currency,self_resolve_uri,age,max_billing_threshold,current_unbilled_spend,adspaymentcycle&access_token=" +
          window.privateToken +
          "&locale=en_US";
        var ApiUrlFinInfo =
          "https://graph.facebook.com/v19.0/act_" +
          window.selectedacc +
          "?fields=funding_source_details&access_token=" +
          window.privateToken +
          "&locale=en_US";
        var todo = "";
        window.getJSON(ApiUrlFullInfo, function (theLibrary, options) {
          todo = `<select onChange="window.open(this.value)" style="width: 100%;background: #384959;">
				 <option value="">Quick links</option>
				 <option value="https://www.facebook.com/accountquality">Account Quality</option>
				 <option value="https://business.facebook.com/help/contact/649167531904667">Manual Pay</option>
				 <option value="https://business.facebook.com/overview">BM Create</option>
				 <option value="https://developers.facebook.com/tools/debug/">FB debugger</option>
				 <option value="https://www.facebook.com/help/contact/305334410308861">Ads Appeal</option>
				 <option value="https://mbasic.facebook.com/support/forms/flow_view?id=2166173276743732">BM Appeal</option>
				 <option value="https://mbasic.facebook.com/support/forms/flow_view?id=273898596750902">Social Acc Appeal</option>
				 <option value="https://mbasic.facebook.com/support/forms/flow_view?id=2158932601016581">Page Appeal</option>
				 <option value="https://mbasic.facebook.com/support/forms/flow_view?id=2026068680760273">Ads ACC Appeal</option>
				 <option value="https://facebook.com/help/contact/391647094929792">Card Appeal</option>
				 <option value="https://business.facebook.com/certification/nondiscrimination/">Nondiscrimination</option>
				 <option value="https://business.facebook.com/help/contact/856051674863409">Re-enable disabled ad account</option>
				 <option value="https://www.facebook.com/payments/risk/preauth/?ad_account_id=${window.selectedacc}&entrypoint=AYMTAdAccountUnrestrictLinkGenerator">Approve Temporary Hold</option>
				 <option value="https://www.facebook.com/diagnostics">iP info</option>
				 <option value="https://www.facebook.com/primary_location/info">Primary Location</option></select>`;
          var addtodo = "";
          if (options.is_new_advertiser) {
            addtodo = "[new]";
          } else addtodo = "[not new]";
          todo =
            todo +
            "<center><b id='fbaccstatusaccname' onclick='window.shadowtext(`fbaccstatusaccname`);return true;'>" +
            options.name +
            "</b> " +
            addtodo +
            "</center>";
          if (theLibrary !== null) {
            alert("Something went wrong: " + theLibrary);
          } else {
            if (options.self_resolve_uri) {
              todo =
                todo +
                ('<span style="color: red;">1$ Payment check : <a href="https://facebook.com/' +
                  options.self_resolve_uri +
                  '">Open</a></span>\n<br>');
            }
            if (options.account_status) {
              switch (options.account_status) {
                case 1:
                  astatus = '<span style="color: green;">ACTIVE</span>';
                  break;
                case 2:
                  astatus =
                    '<span style="color: red;">DISABLED</span> [<a href="https://www.facebook.com/help/contact/2026068680760273" target="_blank">Appeal</a>]';
                  break;
                case 3:
                  astatus = "UNSETTLED";
                  break;
                case 7:
                  astatus = "PENDING_RISK_REVIEW";
                  break;
                case 8:
                  astatus = "PENDING_SETTLEMENT";
                  break;
                case 9:
                  astatus = "IN_GRACE_PERIOD";
                  break;
                case 100:
                  astatus = "PENDING_CLOSURE";
                  break;
                case 101:
                  astatus = "CLOSED";
                  break;
                case 201:
                  astatus = "ANY_ACTIVE";
                  break;
                case 202:
                  astatus = "ANY_CLOSED";
                  break;
                default:
                  astatus = "UNKNOWN " + options.account_status;
                  break;
              }
              todo = todo + ("Account status: " + astatus + "\n<br>");
            }
            if (options.timezone_name) {
              todo =
                todo +
                ("<div id='fbaccstatusacctzoneformdiv' style='display:none;'>Account TZ:<select style='background: #384959;color:white;' id='fbaccstatusacctzoneselect'><option value='0'>TZ_UNKNOWN[0]</option><option value='1'>TZ_AMERICA_LOS_ANGELES[1]</option><option value='7'>TZ_AMERICA_NEW_YORK[7]</option><option value='8'>TZ_ASIA_DUBAI[8]</option><option value='476'>TZ_ASIA_CALCUTTA[476]</option><option value='12'>TZ_EUROPE_VIENNA[12]</option><option value='47'>TZ_EUROPE_BERLIN[47]</option><option value='137'>TZ_EUROPE_KIEV[137]</option><option value='53'>TZ_AFRICA_CAIRO[53]</option><option value='348'>TZ_ATLANTIC_BERMUDA[348]</option><option value='447'>TZ_PACIFIC_FIJI[447]</option></select><button style='background:#384959;color:white;' id='fbaccstatusacctzoneformdivgo' onclick='window.ProcessEdittzone(); return false;'>Go</button></div><div id='fbaccstatusacctzonediv'>Account tzone: <span id='fbaccstatusacctzone' onclick='window.shadowtext(`fbaccstatusacctzone`);return true;'>" +
                  options.timezone_name +
                  "</span><a onclick='window.ShowEdittzone();return true;'>^</a></div>");
            }
            if (options.business_restriction_reason != "none") {
              todo =
                todo +
                ("BM ban reason: <span style='color: red;'>" +
                  options.business_restriction_reason +
                  "</span>\n<br>");
            }
            try {
              if (options.current_unbilled_spend.amount) {
                try {
                  if (options.adspaymentcycle.data[0].threshold_amount > 0) {
                    /* billlim=options.adspaymentcycle.data[0].threshold_amount/100+".00";*/
                    billlim =
                      options.adspaymentcycle.data[0].threshold_amount / 100;
                  }
                } catch (e) {
                  console.log("threshold_amount error");
                  billlim = "na";
                }
                if (window.currency_symbols[options.currency] !== undefined) {
                  currency_symbol = window.currency_symbols[options.currency];
                } else {
                  currency_symbol = options.currency;
                }

                if (options.amount_spent > 0) {
                  allspent = options.amount_spent / 100;
                } else {
                  allspent = 0;
                }
                /*todo = todo + ("Balance: <b>" + options.current_unbilled_spend.amount + "</b>&nbsp;/&nbsp;<b>" + billlim + "</b>&nbsp;/&nbsp; <b>" + allspent + "</b> " + options.currency + ' <br>');*/
                let optcurredit =
                  `<span id='fbaccstatusacccurrformdiv' style='display:none;'><select style='background: #384959;color:white;' id='fbaccstatusacccurrselect'><option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option><option value="PLN">PLN</option><option value="UAH">UAH</option><option value="DZD">DZD</option><option value="ARS">ARS</option><option value="AUD">AUD</option><option value="BDT">BDT</option><option value="BOB">BOB</option><option value="BRL">BRL</option><option value="CAD">CAD</option><option value="CLP">CLP</option><option value="CNY">CNY</option><option value="CZK">CZK</option><option value="EGP">EGP</option><option value="HUF">HUF</option><option value="INR">INR</option><option value="IDR">IDR</option><option value="MYR">MYR</option><option value="PKR">PKR</option><option value="RUB">RUB</option><option value="THB">THB</option><option value="TRY">TRY</option><option value="VND">VND</option><option value="LKR">LKR</option></select><button style='background:#384959;color:white;' id='fbaccstatusacccurrformdivgo' onclick='window.ProcessEditcurr(); return false;'>Go</button></span><span id='fbaccstatusacccurrdiv'>` +
                  options.currency +
                  '<a onclick="window.ShowEditcurr();return true;">^</a></span>';
                options.currency;
                todo =
                  todo +
                  ("Balance: <b>" +
                    currency_symbol +
                    options.current_unbilled_spend.amount +
                    "</b>&nbsp;/&nbsp;<b>" +
                    billlim +
                    "</b>&nbsp;" +
                    optcurredit +
                    "  <br>Amount Spend:&nbsp; <b>" +
                    currency_symbol +
                    allspent +
                    "</b><br>");
              }
            } catch (e) {
              console.log("unbilled_spend error");
            }
            if (options.disable_reason) {
              switch (options.disable_reason) {
                case 0:
                  astatus = "NONE";
                  break;
                case 1:
                  astatus = "ADS_INTEGRITY_POLICY";
                  break;
                case 2:
                  astatus = "ADS_IP_REVIEW";
                  break;
                case 3:
                  astatus =
                    'RISK_PAYMENT [<a href="https://www.facebook.com/help/contact/531795380173090" target="_blank">Appeal</a>]';
                  break;
                case 4:
                  astatus = "GRAY_ACCOUNT_SHUT_DOWN";
                  break;
                case 5:
                  astatus = "ADS_AFC_REVIEW";
                  break;
                case 6:
                  astatus = "BUSINESS_INTEGRITY_RAR";
                  break;
                case 7:
                  astatus = "PERMANENT_CLOSE";
                  break;
                case 8:
                  astatus = "UNUSED_RESELLER_ACCOUNT";
                  break;
                case 9:
                  astatus = "UNUSED_ACCOUNT";
                  break;
                default:
                  astatus = "UNKNOWN " + options.disable_reason;
                  break;
              }
              todo =
                todo +
                ('Disable Reason: <span style="color: red;">' +
                  astatus +
                  "</span>\n<br>");
            }
            if (options.adtrust_dsl) {
              if (options.adtrust_dsl == -1) {
                slimit = "no limit";
              } else {
                slimit = currency_symbol + options.adtrust_dsl;
              }
              todo = todo + ("Spend Limit: <b>" + slimit + "</b>\n<br>");
            }

            appendadd(todo, "dblock1");

            /*try {
					  if (options.adimages.data.length) {
						 // document.getElementById("tabhead2").innerHTML="AdImg("+options.adimages.data.length+")";
						 todo = "\n";
						 
						 todo = todo + '<center>AdImages:</center><table border="0.1"><tr style="font-size: 12px;text-decoration: none;color: #7FB5DA;"><th>#</th><th>Name</th><th>Ads</th><th>AI reviewed</th><th>Human</th></tr>';
						 var i = 0;
						   for (; i < options.adimages.data.length; i++) {
							 if (options.adimages.data[i].name) {
							   todo = todo + "<tr>";
							   if (options.adimages.data[i].url_128) {
								 tblcreo = '<img width=30 height=30 src="' + options.adimages.data[i].url_128 + '"/>';
							   } else {
								 tblcreo = "";
							   }
							   if(options.adimages.data[i].creatives) {
							   countcreo=options.adimages.data[i].creatives.length;
							   } else countcreo='n/a';
							   
							   switch(options.adimages.data[i].ads_integrity_review_info.is_reviewed) {
								   case true:revstatus = '<b style="color:green;">&#10003;</b>';break;
								   case false:revstatus = 'n/a';break;
								   
								   default:
									 revstatus = " " + options.adimages.data[i].ads_integrity_review_info.is_reviewed;break;
								 }
							   
							   switch(options.adimages.data[i].ads_integrity_review_info.is_human_reviewed) {
								   case true:hrevstatus = '<b style="color:green;">&#10003;</b>';break;
								   case false:hrevstatus = 'n/a';break;
								   
								   default:
									 hrevstatus = " " + options.adimages.data[i].ads_integrity_review_info.is_human_reviewed;break;
								 }
								 
							   
								 todo = todo + ("<td><b>" + tblcreo + "</b></td><td><b>" + options.adimages.data[i].name + "</b></td> <td><center><b>" + countcreo + "</b></center> " + "</td><td><center><b>" + revstatus + "</b></center> " + "</td> <td><center><b>" + hrevstatus + "</b></center> " + "</td>");
							   todo = todo + "</tr>";
							 }
						   }
						 
						window.appendtab(todo, "tab2"); 
					  }
					  }
		catch (e) {
		   console.log("no adimg");
		} 
		   try {
				  if (options.advideos.data.length) {
					 // document.getElementById("tabhead3").innerHTML="AdVid("+options.advideos.data.length+")";
					 todo = "\n";
					 
					 todo = todo + '<center>AdVideos:</center><table border="0.1"><tr style="font-size: 12px;text-decoration: none;color: #7FB5DA;"><th>#</th><th>id</th><th>Ads</th><th>AI reviewed</th><th> Human</th></tr>';
					 var i = 0;
					   for (; i < options.advideos.data.length; i++) {
						 if (options.advideos.data[i].id) {
						   todo = todo + "<tr>";
						   if (options.advideos.data[i].picture) {
							 tblcreo = '<a href="' + options.advideos.data[i].picture + '" target="_blank"><img width=30 height=30 src="' + options.advideos.data[i].picture + '"/></a>';
						   } else {
							 tblcreo = "";
						   }
						   if(options.advideos.data[i].creatives) {
						   countcreo=options.advideos.data[i].creatives.length;
						   } else countcreo='n/a';
						   switch(options.advideos.data[i].ads_integrity_review_info.is_reviewed) {
							   case true:vrevstatus = '<b style="color:green;">&#10003;</b>';break;
							   case false:vrevstatus = 'n/a';break;///&#10060;
							   
							   default:
								 vrevstatus = " " + options.advideos.data[i].ads_integrity_review_info.is_reviewed;break;
							 }
						   
						   switch(options.advideos.data[i].ads_integrity_review_info.is_human_reviewed) {
							   case true:vhrevstatus = '<b style="color:green;">&#10003;</b>';break;
							   case false:vhrevstatus = 'n/a';break;
							   
							   default:
								 hrevstatus = " " + options.advideos.data[i].ads_integrity_review_info.is_human_reviewed;break;
							 }
							 todo = todo + ("<td><b>" + tblcreo + "</b></td><td><b>" + options.advideos.data[i].id + "</b></td> <td><center><b>" + countcreo + "</b></center> " + "</td><td><center><b>" + vrevstatus + "</b></center> " + "</td> <td><center><b>" + vhrevstatus + "</b></center> " + "</td>");
						   todo = todo + "</tr>";
						 }
					   }
					window.appendtabplus(todo, "tab2"); 
				  }
				  }
	catch (e) {
	   console.log("no advid");
	}*/
          }
        });
        window.checkauth();
        try {
          todo = await window.getAccAds(window.selectedacc);
        } catch (e) {
          console.log("main ads error");
          todo = "No ads";
        }
        await window.appendtab(todo, "tab1");
        /* window.getJSON(ApiUrlMainInfo, function(theLibrary, b) {
			   if (theLibrary !== null) {
				 alert("Something went wrong: " + theLibrary);
			   } else {
				   
				   var todo = "";
				 
				 try {
					 
					 todo = todo + "\n";
					 if(b.data.length>0){
					   todo = todo + '<table border="0.1"><tr style="font-size: 12px;text-decoration: none;color: #7FB5DA;"><th>#</th><th>Name</th><th>Status</th><th></th></tr>';}
				 var i = 0;
				 document.getElementById("tabhead1").innerHTML="Ads("+b.data.length+")";
				 for (; i < b.data.length; i++) {
				   if (b.data[i].name) {
					 todo = todo + "<tr>";
					 
					 if(b.data[i].delivery_status.status){
						 switch(b.data[i].delivery_status.status) {
						   case "active":delivstatus = '<b>&#128994;</b>ACTIVE';break;
						   case "inactive":delivstatus = '<b>&#x23F8;</b>INACTIVE';break;
						   case "off":delivstatus = '<b>&#x23F8;</b>INACTIVE';break;
						   case "error":delivstatus = '&#128997;Error';break;
						   case "xz":delivstatus = "xz";break;
						   
						   default:
							 delivstatus = " " + b.data[i].delivery_status.status;break;
						 }
					 }
					 
					 if (b.data[i].adcreatives.data[0].image_url) {
					   tblcreo = '<img width=30 height=30 src="' + b.data[i].adcreatives.data[0].image_url + '" onclick="window.copytocb(`'+b.data[i].id+'`);"/>';
					 } else {
					   tblcreo = "";
					 }
					 if (b.data[i].ad_review_feedback) {
					   todo = todo + ("<td><b>" + tblcreo + "</b></td><td><b onclick='window.copytocb(`"+b.data[i].id+"`);'>" + b.data[i].name + "</b></td><td>[" + delivstatus + '] <!--[<a onclick="window.appealadcreo(`' + b.data[i].id + '`);" href="#">Appeal</a>]--><button style="background:#384959;color:white;" id="MainAppeal' + b.data[i].id + '" onclick="window.appealadcreo(`' + b.data[i].id + '`); return false;">Appeal</button>' + "</td>");
					 } else {
					   todo = todo + ("<td><b>" + tblcreo + "</b></td><td><b onclick='window.copytocb(`"+b.data[i].id+"`);'>" + b.data[i].name + "</b></td> <td>[" + delivstatus + "] " + "</td>");
					 }
					 if (b.data[i].ad_review_feedback) {
					   if (b.data[i].ad_review_feedback.global) {
						   todo = todo + ("<td>");
						   var rjkey; 
						   for (var k in b.data[i].ad_review_feedback.global) {
							   rjkey = k + "[<a onclick='alert(\""+b.data[i].ad_review_feedback.global[k]+"\");'> ? </a>]";
							   todo = todo + (rjkey);
						   }
						 todo = todo + ("</td>");
					   } else {
						 todo = todo + "<td></td>";
					   }
					 }
					 todo = todo + "</tr>";
				   }
				 }
				 }
   catch (e) {
	  console.log("main ads error");
	  todo = todo + "No ads";
   }
				 todo = todo + "</table>";
				   window.appendtab(todo, "tab1");
				
			   }
			 });*/

        window.getJSON(ApiUrlFinInfo, function (theLibrary, options) {
          if (theLibrary !== null) {
            console.log("card req error");
          } else {
            try {
              if (options.funding_source_details.display_string) {
                window.appendtab(
                  "Card: <b>" +
                    options.funding_source_details.display_string +
                    '</b>&nbsp;[<a onclick="window.addCCtoadAccForm();return true;">add</a>]<br>',
                  "dblock1cc",
                );
              }
            } catch (e) {
              console.log("card info write error");
            }
          }
        });
      };
      window.mainload();
    }
  } else {
    if (location.host.indexOf("facebook.com") > -1) {
      location.href = "/adsmanager/manage/campaigns";
    } else {
      if (confirm("Are you sure you want to open facebook adsmanager?")) {
        location.href = "https://www.facebook.com/adsmanager/manage/campaigns";
      }
    }
  }
})();
